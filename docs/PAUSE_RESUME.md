# MyPetPair cloud pause and resume

## Run the start and stop script

Install Python 3 and the [Google Cloud CLI](https://docs.cloud.google.com/sdk/docs/install). Sign in with `gcloud auth login` using an account that can update the MyPetPair Cloud Run service and Cloud SQL instance. The script targets project `mypetpair` (number `248924650823`) regardless of your gcloud default project. Run these commands from your local clone or Google Cloud Shell.

```bash
python3 scripts/power-gcp.py status
python3 scripts/power-gcp.py down
python3 scripts/power-gcp.py up
```

- `status` reads Cloud Run scaling and Cloud SQL state from Google Cloud without sending traffic to the app.
- `down` disables Cloud Run, verifies that the app returns HTTP 503, then stops Cloud SQL. Data and backups stay in place. Storage charges can continue while the app is down.
- `up` starts Cloud SQL, restores Cloud Run autoscaling and verifies a live database query through the health endpoint. The database stays private. Allow up to 20 minutes for a database operation. Normal database compute charges resume.

Run one power command at a time. If interrupted or a step fails, inspect `status` and rerun the intended command. The script waits for in-progress Cloud SQL operations and skips changes already applied. The [manual commands below](#resume-only-when-requested) are available for troubleshooting.

## Current state

MyPetPair resumed at the owner's request on **23 November 2026**. Cloud Run revision `mypetpair-00005-d54` serves 100% of traffic with automatic scaling, service maximum 3 and revision maximum 2. PostgreSQL is running with activation policy `ALWAYS` and public IPv4 disabled.

At **14:26 IST**, the web home page, `/api/config` and `/api/health` all returned HTTP 200. The health endpoint executed `SELECT 1`, verifying the private database connection. The revision uses the existing image, runtime identity and secret bindings. The startup operation completed successfully after about ten minutes, exceeding the initial CLI wait. Local verification evidence is in `.local/power-state/2026-11-23/status.json`. [Open MyPetPair](https://mypetpair-248924650823.us-central1.run.app).

## Previous pause

MyPetPair was paused on **22 November 2026** at the owner's request to reduce costs. The settings below describe that pause. No scheduled restart was configured.

- GCP project: `mypetpair`, number `248924650823`; region: `us-central1`.
- Cloud Run service `mypetpair`: manual scaling, **0 instances**. Requests cannot wake it. The existing web and Android clients are unavailable while paused.
- Cloud SQL PostgreSQL instance `mypetpair-pilot`: activation policy **NEVER**. Database contents, accounts, photos, chat and deletion protection are retained.
- Cloud Run revision `mypetpair-00004-9m4` saves the private-network settings. The existing container image, service identity, secret bindings, IAM and URLs are retained. No rebuild or app reinstall is required to resume this deployment.
- Latest successful automated backup observed before stopping: `1795316400000`, completed `2026-11-22T05:49:42.738Z`.

Verified at **19:45 IST on 22 November 2026**: SQL stop operation `f4f63bed-04cd-4c94-8d4f-d4cc00000032` completed `DONE` without errors; instance state is `STOPPED`. Cloud Run has manual instance count `0` and its revision reports `TrafficShutDown=True`. Both service URLs return HTTP `503` for `/` and `/api/health`. Runtime container configuration and service IAM exactly match the pre-pause snapshots. Verification evidence is saved privately alongside those snapshots in `status.json`.

Private pre-pause service, database and service-IAM snapshots are saved locally in `.local/power-state/2026-11-22/`, with restricted file permissions and Git exclusion. They contain configuration and secret references; do not publish them.

## Private networking and removal of the public IP

The owner subsequently authorized private networking to eliminate the idle public IPv4 charge. The retained infrastructure is:

| Resource | Configuration |
| --- | --- |
| Custom VPC | `mypetpair-private`, regional routing |
| Cloud Run subnet | `mypetpair-run-us-central1`, `us-central1`, `10.42.0.0/26`, Private Google Access enabled |
| SQL service allocation | `mypetpair-sql-private-range`, internal `10.43.0.0/24`, purpose `VPC_PEERING` |
| Private services access | `servicenetworking-googleapis-com` peering, active |
| Cloud SQL connectivity | Private IP on `mypetpair-private`, public IPv4 disabled |
| Cloud Run connectivity | Direct VPC egress on the subnet above, `private-ranges-only` |
| JDBC connection | Existing Cloud SQL Java connector URL plus `ipTypes=PRIVATE`; lazy certificate refresh retained |

No Serverless VPC Access connector, Cloud NAT gateway, router or VM was added. Direct VPC egress scales to zero with the service. The internal range allocation is not a reserved public IPv4 address.

Google rejected editing the stopped SQL instance, so the network change starts the database for maintenance and stops it again after completion. The application stays at manual zero throughout. The first private-services connection attempt failed with a managed-identity initialization error; explicitly initializing the Service Networking service identity and retrying succeeded. Its standard service-agent role was already present; no extra human or application roles were granted.

The Cloud Run configuration update used `--scaling=0 --no-deploy-health-check` to avoid starting a container against the stopped database. The 23 November resume re-enabled the deployment startup check. Private migration snapshots and operation evidence are stored locally under `.local/power-state/2026-11-22/private-network/`.

Final verification at **20:21 IST on 22 November 2026** passed. SQL network operation `1eb4e170-604b-4757-9f5e-ea8800000032` and subsequent stop operation `54a25a23-0150-410e-80b8-1a7600000032` both completed `DONE` without errors. SQL is `STOPPED` / `NEVER`, `ipv4Enabled=false`, with only a private address and deletion protection retained. Cloud Run is manual zero on revision `mypetpair-00004-9m4`; both URLs return HTTP503 at `/` and `/api/health`. Image, non-DB-URL runtime settings, secret bindings, service IAM, SQL version/tier/disk/backup settings are unchanged. Private peering is active; there are no external reserved Compute Engine addresses, routers/NAT or VMs. The final read-only configuration and shutdown checks passed. No application container was started; live private SQL connectivity remains a first-resume check.

## Resume only when requested

Check the project identity and start the database first. Wait for the SQL update operation to finish successfully and confirm the instance is `RUNNABLE` with activation policy `ALWAYS`:

```bash
gcloud projects describe mypetpair --format='value(projectNumber)'
gcloud sql instances patch mypetpair-pilot \
  --activation-policy=ALWAYS --project=mypetpair --quiet
gcloud sql instances describe mypetpair-pilot --project=mypetpair \
  --format='json(state,settings.activationPolicy,settings.ipConfiguration,ipAddresses)'
```

Confirm `ipv4Enabled=false`, a `PRIVATE` address and the expected private network. Cloud Run already has Direct VPC egress and `ipTypes=PRIVATE` configured; preserve them. Do not re-enable public IP to resume. Database administration from a local computer or Cloud Shell no longer has a direct public path; use an authorized workload within the VPC for future database maintenance.

Then restore Cloud Run automatic scaling and re-enable the deployment startup check. This can create a new revision with the same image and private networking, and verifies that its container starts against the running database. The pre-pause service-level maximum was **3**; the deployed revision has its own maximum of **2** and an implicit minimum of **0**. The manual-zero update removed the service-level maximum annotation, so restore it explicitly:

```bash
gcloud run services update mypetpair --scaling=auto --max=3 --deploy-health-check \
  --region=us-central1 --project=mypetpair --quiet
curl --fail --show-error --max-time 90 \
  https://mypetpair-248924650823.us-central1.run.app/api/health
curl --fail --show-error --max-time 90 \
  https://mypetpair-248924650823.us-central1.run.app/api/config
```

Allow for the first container's cold start; inspect the Cloud Run readiness and SQL operation if health does not recover. Verify the resumed revision, unchanged image, secret bindings, public URL and web landing page before reporting the service as running. Update this status and the operations notice after successful recovery. Preserve the database; do not run provisioning, recreate accounts, rotate passwords or rebuild merely to resume.

## Pause again

Save the current configuration privately, confirm the project number and inspect Cloud Run traffic tags before using these commands. Tagged revisions may remain accessible independently; the 22 November deployment had none.

```bash
gcloud run services update mypetpair --scaling=0 \
  --region=us-central1 --project=mypetpair --quiet
gcloud sql instances patch mypetpair-pilot \
  --activation-policy=NEVER --project=mypetpair --quiet
```

Verify manual instance count `0`, SQL state `STOPPED` / policy `NEVER`, successful completion of the SQL operation, and HTTP `503` from both the web root and `/api/health`. A Cloud Run `Ready=True` control-plane condition by itself does not mean the disabled application is serving traffic.

## Remaining costs and safeguards

This pauses compute without deleting the project or its data. Cloud SQL disk and backup charges can continue while stopped. Public IPv4 is disabled, removing the idle public-IP charge (published rate at the time of this change: USD0.01/hour, approximately USD7.20 per 30 days before taxes/currency conversion). Artifact Registry images, Cloud Build source archives, Secret Manager versions and retained logs also remain subject to their applicable storage/retention charges or free allowances. This is a cost reduction, not a zero-bill guarantee. Do not delete retained data or disable project billing to reduce these further without a separate owner decision.

Inventory during shutdown found no Compute Engine VMs, standalone persistent disks, reserved Compute Engine addresses, forwarding rules, Cloud Run jobs, active regional Cloud Builds, or regional/global Cloud Build triggers. Cloud Scheduler API was not enabled. One Artifact Registry repository and one Cloud Build source bucket were retained. No restart automation was added.

Use the power script to change the service state. It acts on the existing Cloud Run service and database. Plan deployments separately and preserve the VPC, subnet and private JDBC settings. The repository, published Android APK and local development setup are available while hosting is paused. The APK needs the hosted API to sign in.

References: [Cloud Run manual scaling and disabling a service](https://docs.cloud.google.com/run/docs/configuring/services/manual-scaling), [Cloud SQL stopping behavior and continuing charges](https://docs.cloud.google.com/sql/docs/postgres/start-stop-restart-instance), [private services access](https://docs.cloud.google.com/sql/docs/postgres/configure-private-services-access), [disabling public IP](https://docs.cloud.google.com/sql/docs/postgres/configure-ip#disable-public-ip), [Direct VPC egress](https://docs.cloud.google.com/run/docs/configuring/vpc-direct-vpc), [Cloud SQL pricing](https://cloud.google.com/sql/pricing).
