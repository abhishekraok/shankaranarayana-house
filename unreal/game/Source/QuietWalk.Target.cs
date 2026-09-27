using UnrealBuildTool;
public class QuietWalkTarget : TargetRules {
    public QuietWalkTarget(TargetInfo Target) : base(Target) {
        Type = TargetType.Game;
        DefaultBuildSettings = BuildSettingsVersion.Latest;
        ExtraModuleNames.Add("QuietWalk");
    }
}
