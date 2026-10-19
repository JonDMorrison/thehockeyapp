# Calendar refresh operations

Manual sync supports team and private home calendars. Automatic refresh uses the private `hockey-calendar-sync` database job every 15 minutes. Each run selects up to 12 team and 12 home connections, oldest attempt first, with four concurrent requests and bounded timeouts. Larger connection counts rotate across runs; manual Sync remains available immediately.

## Configuration and activation

1. Set the function secret `HOCKEY_CALENDAR_SYNC_SECRET` to a random private value. Never put it in a browser variable or source control.
2. Store a JSON config in Supabase Vault under `hockey_calendar_sync_dispatch` with `url` (project URL), `apikey` (legacy public request JWT for the function gateway) and `secret` (matching private value).
3. Deploy `sync-schedule`. The private secret authorizes only `sync_all`; it cannot authorize arbitrary preview or individual-user actions. Ordinary callers still require validated user tokens and the correct team/player permission.
4. Call `SELECT public.dispatch_calendar_sync();` as the database operator. Inspect that request's `net._http_response` status and result counts. HTTP 207 means some connections failed; inspect those connections' saved `sync_error`. A successful SQL queue operation alone does not prove HTTP success.
5. Activate after configuration and verification:

```sql
select cron.alter_job(job_id := (select jobid from cron.job where jobname='hockey-calendar-sync'), active := true);
```

The additive migration registers the job paused. To pause it again, use the same statement with `active := false`. Job SQL contains no credentials. Anonymous and authenticated app users cannot execute the SQL dispatcher or trigger a global refresh.

## Failure handling and scope

Feed downloads are bounded and validated before importing. A failed bulk upsert cannot cancel the previous schedule. Later cancellation/status errors are reported as failures and can be retried using stable external event IDs. This is not a claim that every stage is one database transaction.

Timezone conversion uses the runtime timezone database and the selected timezone for floating values. Provider-specific recurrence and custom timezone definitions still require validation with a real account feed. Test fixtures use fictional events only and are removed before enabling the recurring job.

Reference: [Supabase scheduled functions and Vault](https://supabase.com/docs/guides/functions/schedule-functions), [Cron controls and run history](https://supabase.com/docs/guides/cron/quickstart).
