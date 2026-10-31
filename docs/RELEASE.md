# MyPetPair release record

The current release is a gated pilot. Public registration, email verification/recovery, signed store releases and real-user public-launch readiness are separate milestones.

Repository publication and deployment are pending completion of implementation verification. Planned repository is private under the authenticated GitHub owner. Planned GCP target is MyPetPair, project `mypetpair`, number `248924650823`, region `us-central1`. Architecture and cost drivers were documented before provisioning in `docs/ARCHITECTURE.md`.

Release procedure: run checks; scan tracked source; create repository in Brave and push reviewed commit; provision/build/deploy using `scripts/deploy-gcp.py`; create operator account through the invitation gate; assign its immutable ID; validate deployed runtime and record actual resources/URLs here.

Secrets never belong in this record. Operator password and invitation will live in Secret Manager. The console reports a free-trial account with about 14 days remaining at initial inspection; no billing upgrade is performed by this workflow. Confirm billing continuity before relying on the service.
