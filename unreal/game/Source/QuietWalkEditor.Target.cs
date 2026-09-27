using UnrealBuildTool;
public class QuietWalkEditorTarget : TargetRules {
    public QuietWalkEditorTarget(TargetInfo Target) : base(Target) {
        Type = TargetType.Editor;
        DefaultBuildSettings = BuildSettingsVersion.Latest;
        ExtraModuleNames.Add("QuietWalk");
    }
}
