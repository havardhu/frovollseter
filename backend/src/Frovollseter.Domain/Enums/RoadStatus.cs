namespace Frovollseter.Domain.Enums;

public enum RoadStatus
{
    Unknown,
    RecentlyPlowed,
    SummerTiresOk,
    FourWheelDriveRecommended,
    FloodDamage,
    UnsafeDangerous,
    Closed
}

public enum AssociationType
{
    Hytteeierlag,
    Veglag,
    Grunneier
}

public enum UserRole
{
    Member,
    Admin,
    SystemAdmin
}

public enum UserStatus
{
    Pending,
    Active,
    Suspended
}

public enum AuthTokenType
{
    MagicLink,
    Otp
}

public enum AuthChannel
{
    Email,
    Sms
}

public enum WebcamAccessLevel
{
    Public,
    Members,
    Private
}

public enum WebcamFeedType
{
    StaticImage,
    VideoFeed
}
