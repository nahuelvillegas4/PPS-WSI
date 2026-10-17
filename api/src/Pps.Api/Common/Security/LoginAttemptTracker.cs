namespace Pps.Api.Common.Security;

using System.Collections.Concurrent;

public class LoginAttemptTracker : ILoginAttemptTracker
{
    private class AttemptRecord
    {
        public int FailureCount { get; set; }
        public DateTime LastAttempt { get; set; }
        public DateTime? BlockedUntil { get; set; }
    }

    private readonly ConcurrentDictionary<string, AttemptRecord> _records = new(StringComparer.OrdinalIgnoreCase);
    private readonly int _maxFailures;
    private readonly TimeSpan _lockoutDuration;
    private readonly TimeSpan _attemptWindow;

    public LoginAttemptTracker(int maxFailures = 5, TimeSpan? lockoutDuration = null, TimeSpan? attemptWindow = null)
    {
        _maxFailures = maxFailures;
        _lockoutDuration = lockoutDuration ?? TimeSpan.FromMinutes(5);
        _attemptWindow = attemptWindow ?? TimeSpan.FromMinutes(5);
    }

    public bool IsBlocked(string key)
    {
        if (string.IsNullOrWhiteSpace(key)) return false;

        if (_records.TryGetValue(key, out var record))
        {
            var now = DateTime.UtcNow;
            if (record.BlockedUntil.HasValue)
            {
                if (now < record.BlockedUntil.Value)
                {
                    return true;
                }

                // Lockout expired
                record.BlockedUntil = null;
                record.FailureCount = 0;
            }
        }

        return false;
    }

    public void RecordFailedAttempt(string key)
    {
        if (string.IsNullOrWhiteSpace(key)) return;

        var now = DateTime.UtcNow;
        _records.AddOrUpdate(
            key,
            _ => new AttemptRecord { FailureCount = 1, LastAttempt = now },
            (_, record) =>
            {
                if (now - record.LastAttempt > _attemptWindow)
                {
                    record.FailureCount = 1;
                }
                else
                {
                    record.FailureCount++;
                }

                record.LastAttempt = now;

                if (record.FailureCount >= _maxFailures)
                {
                    record.BlockedUntil = now.Add(_lockoutDuration);
                }

                return record;
            });
    }

    public void ResetAttempts(string key)
    {
        if (string.IsNullOrWhiteSpace(key)) return;
        _records.TryRemove(key, out _);
    }
}
