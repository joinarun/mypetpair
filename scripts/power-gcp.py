#!/usr/bin/env python3
"""Start, stop, or inspect the existing MyPetPair deployment."""

import argparse
import json
import subprocess
import sys
import time
from urllib.error import HTTPError, URLError
from urllib.parse import parse_qs
from urllib.request import urlopen

PROJECT = "mypetpair"
PROJECT_NUMBER = "248924650823"
REGION = "us-central1"
SERVICE = "mypetpair"
INSTANCE = "mypetpair-pilot"
NETWORK = "mypetpair-private"
SUBNET = "mypetpair-run-us-central1"
URL = f"https://{SERVICE}-{PROJECT_NUMBER}.{REGION}.run.app"
RUN_SERVICE = (SERVICE, f"--region={REGION}")
SQL_WAIT_SECONDS = 1200
HTTP_WAIT_SECONDS = 180
RUN_MAX = "3"


def gcloud(*args, output="json"):
    command = ["gcloud", *args, f"--project={PROJECT}", "--quiet"]
    if output is None:
        subprocess.run(command, check=True)
        return
    result = subprocess.run(
        [*command, f"--format={output}"], check=True, text=True, stdout=subprocess.PIPE
    )
    return json.loads(result.stdout) if output == "json" else result.stdout.strip()


def service_state():
    return gcloud("run", "services", "describe", *RUN_SERVICE)


def database_state():
    return gcloud("sql", "instances", "describe", INSTANCE)


def annotations(service):
    return service["metadata"].get("annotations", {})


def run_is_off(service):
    config = annotations(service)
    return config.get("run.googleapis.com/scalingMode") == "manual" and str(
        config.get("run.googleapis.com/manualInstanceCount")
    ) == "0"


def sql_is(database, state, policy):
    return database["state"] == state and database["settings"]["activationPolicy"] == policy


def require_private_connection(service, database):
    ip = database["settings"]["ipConfiguration"]
    network_path = f"/projects/{PROJECT}/global/networks/{NETWORK}"
    private_network = "/" + ip.get("privateNetwork", "").lstrip("/")
    if (
        ip.get("ipv4Enabled") is not False
        or not private_network.endswith(network_path)
        or {address["type"] for address in database.get("ipAddresses", [])} != {"PRIVATE"}
    ):
        raise RuntimeError("Cloud SQL does not match the expected private-only network.")
    template = service["spec"]["template"]
    network = template["metadata"].get("annotations", {})
    interfaces = json.loads(network.get("run.googleapis.com/network-interfaces", "[]"))
    db_url = next(
        (
            entry.get("value", "")
            for container in template["spec"]["containers"]
            for entry in container.get("env", [])
            if entry["name"] == "DB_URL"
        ),
        "",
    )
    params = parse_qs(db_url.partition("?")[2])
    if (
        not any(entry.get("network") == NETWORK and entry.get("subnetwork") == SUBNET for entry in interfaces)
        or network.get("run.googleapis.com/vpc-access-egress") != "private-ranges-only"
        or params.get("ipTypes") != ["PRIVATE"]
        or params.get("cloudSqlInstance") != [f"{PROJECT}:{REGION}:{INSTANCE}"]
    ):
        raise RuntimeError("Cloud Run does not match the expected private database connection.")


def wait_for_sql(operation):
    print(f"Waiting for Cloud SQL operation {operation}. This can take several minutes.", flush=True)
    gcloud("sql", "operations", "wait", operation, f"--timeout={SQL_WAIT_SECONDS}", output=None)
    result = gcloud("sql", "operations", "describe", operation)
    if result["status"] != "DONE" or result.get("error"):
        raise RuntimeError(f"Cloud SQL operation {operation} did not complete successfully.")


def set_database(state, policy):
    database = database_state()
    if not sql_is(database, state, policy):
        operation = gcloud("sql", "instances", "patch", INSTANCE, f"--activation-policy={policy}", "--async")
        wait_for_sql(operation["name"])
        database = database_state()
    if not sql_is(database, state, policy):
        raise RuntimeError(f"Cloud SQL did not reach {state} with activation policy {policy}.")
    return database


def wait_for_http(expected):
    deadline = time.monotonic() + HTTP_WAIT_SECONDS
    detail = "no response"
    while time.monotonic() < deadline:
        try:
            with urlopen(f"{URL}/api/health", timeout=15) as response:
                if expected == 200 and response.status == 200 and json.load(response).get("status") == "ok":
                    return
                detail = f"HTTP {response.status} with unexpected health result"
        except HTTPError as exc:
            with exc:
                if exc.code == expected == 503:
                    return
                detail = f"HTTP {exc.code}"
        except (OSError, URLError, ValueError) as exc:
            detail = str(exc)
        time.sleep(5)
    raise RuntimeError(f"Health check expected HTTP {expected}, last result: {detail}.")


def bring_up(service):
    require_private_connection(service, database_state())
    database = set_database("RUNNABLE", "ALWAYS")
    if not autoscaling_restored(service):
        print("Enabling Cloud Run autoscaling and the deployment startup check.", flush=True)
        gcloud(
            "run", "services", "update", *RUN_SERVICE, "--scaling=auto", f"--max={RUN_MAX}",
            "--deploy-health-check", output=None,
        )
    service = service_state()
    if not autoscaling_restored(service):
        raise RuntimeError("Cloud Run did not restore the expected autoscaling and startup check.")
    require_private_connection(service, database)
    wait_for_http(200)
    print(f"MyPetPair is online and the private database health check passed.\n{URL}")


def autoscaling_restored(service):
    config = annotations(service)
    health_check = service["spec"]["template"]["metadata"].get("annotations", {})
    return (
        config.get("run.googleapis.com/scalingMode", "automatic") == "automatic"
        and str(config.get("run.googleapis.com/maxScale")) == RUN_MAX
        and health_check.get("run.googleapis.com/health-check-disabled") != "true"
    )


def bring_down(service):
    targets = service.get("spec", {}).get("traffic", []) + service.get("status", {}).get("traffic", [])
    if any(target.get("tag") for target in targets):
        raise RuntimeError("Cloud Run has traffic tags that can bypass manual zero. Review the tags before stopping.")
    if not run_is_off(service):
        print("Disabling Cloud Run traffic with manual scaling set to zero.", flush=True)
        gcloud("run", "services", "update", *RUN_SERVICE, "--scaling=0", output=None)
    if not run_is_off(service_state()):
        raise RuntimeError("Cloud Run did not reach manual scaling at zero.")
    wait_for_http(503)
    set_database("STOPPED", "NEVER")
    print("MyPetPair is offline and Cloud SQL is stopped. Storage and backup charges can continue.")


def show_status(service, database):
    scaling = annotations(service).get("run.googleapis.com/scalingMode", "automatic")
    mode = "manual zero (disabled)" if run_is_off(service) else scaling
    revision = service.get("status", {}).get("latestReadyRevisionName", "unknown")
    policy = database["settings"]["activationPolicy"]
    public_ip = database["settings"]["ipConfiguration"].get("ipv4Enabled")
    public_ip_status = {True: "enabled", False: "disabled"}.get(public_ip, "unknown")
    print(f"Cloud Run: {mode}, ready revision {revision}")
    print(f"Cloud SQL: {database['state']}, activation policy {policy}, public IPv4 {public_ip_status}")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("action", choices=("up", "down", "status"))
    action = parser.parse_args().action
    number = gcloud("projects", "describe", PROJECT, output="value(projectNumber)")
    if number != PROJECT_NUMBER:
        raise RuntimeError(f"Expected Google Cloud project {PROJECT} ({PROJECT_NUMBER}).")

    if action == "status":
        show_status(service_state(), database_state())
        return

    operations = gcloud("sql", "operations", "list", f"--instance={INSTANCE}",
                        "--filter=status=(RUNNING PENDING)")
    for operation in operations:
        wait_for_sql(operation["name"])
    service = service_state()
    if action == "up":
        bring_up(service)
    else:
        bring_down(service)


if __name__ == "__main__":
    try:
        main()
    except FileNotFoundError:
        sys.exit("The Google Cloud CLI (gcloud) must be installed and on your PATH.")
    except (RuntimeError, subprocess.CalledProcessError) as exc:
        sys.exit(f"{exc}\nRun status to inspect the current state. Rerun up or down after resolving the error.")
    except KeyboardInterrupt:
        sys.exit("Interrupted. Cloud operations may still be running. Check status, then rerun up or down.")
