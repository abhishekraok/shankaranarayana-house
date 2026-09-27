using UnrealBuildTool;
public class QuietWalk : ModuleRules {
    public QuietWalk(ReadOnlyTargetRules Target) : base(Target) {
        PCHUsage = PCHUsageMode.UseExplicitOrSharedPCHs;
        PublicDependencyModuleNames.AddRange(new [] { "Core", "CoreUObject", "Engine", "InputCore", "Slate", "SlateCore", "Json" });
    }
}
