namespace Pps.Api.Common.Security;

public interface ILoginAttemptTracker
{
    bool IsBlocked(string key);
    void RecordFailedAttempt(string key);
    void ResetAttempts(string key);
}
