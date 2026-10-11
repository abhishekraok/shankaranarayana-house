#include "QuietWalk.h"
#include "Modules/ModuleManager.h"
#include "Camera/CameraComponent.h"
#include "Camera/CameraActor.h"
#include "Camera/PlayerCameraManager.h"
#include "Components/CapsuleComponent.h"
#include "Components/InputComponent.h"
#include "Components/AudioComponent.h"
#include "Components/SkyLightComponent.h"
#include "GameFramework/CharacterMovementComponent.h"
#include "GameFramework/GameUserSettings.h"
#include "Kismet/GameplayStatics.h"
#include "Kismet/KismetSystemLibrary.h"
#include "HAL/IConsoleManager.h"
#include "HAL/FileManager.h"
#include "HAL/PlatformApplicationMisc.h"
#include "HAL/PlatformProcess.h"
#include "GenericPlatform/GenericWindow.h"
#include "Engine/GameViewportClient.h"
#include "Engine/World.h"
#include "Engine/Engine.h"
#include "Engine/TextureCube.h"
#include "EngineUtils.h"
#include "Sound/SoundWave.h"
#include "UnrealClient.h"
#include "Framework/Application/SlateApplication.h"
#include "Widgets/SCompoundWidget.h"
#include "Widgets/SWindow.h"
#include "Widgets/SOverlay.h"
#include "Widgets/SBoxPanel.h"
#include "Widgets/Layout/SBox.h"
#include "Widgets/Layout/SBorder.h"
#include "Widgets/Layout/SScrollBox.h"
#include "Widgets/Layout/SScaleBox.h"
#include "Widgets/Text/STextBlock.h"
#include "Widgets/Input/SButton.h"
#include "Widgets/Input/SMultiLineEditableTextBox.h"
#include "Widgets/Images/SImage.h"
#include "Engine/Texture2D.h"
#include "ImageUtils.h"
#include "Styling/CoreStyle.h"
#include "Misc/FileHelper.h"
#include "Misc/Paths.h"
#include "Misc/CommandLine.h"
#include "Misc/Parse.h"
#include "Serialization/JsonWriter.h"
#include "Serialization/JsonSerializer.h"
#include "Serialization/JsonReader.h"
#if PLATFORM_WINDOWS
#include "Windows/WindowsHWrapper.h"
#endif

IMPLEMENT_PRIMARY_GAME_MODULE(FDefaultGameModuleImpl, QuietWalk, "QuietWalk");

namespace {
const FLinearColor Cream(.89f,.85f,.73f,1), Muted(.55f,.62f,.57f,1), Gold(.70f,.51f,.26f,1);
FText Txt(const FString& S) { return FText::FromString(S); }
TSharedRef<STextBlock> Label(const FString& S, int Size=16, FLinearColor Color=Cream) {
    return SNew(STextBlock).Text(Txt(S)).Font(FCoreStyle::GetDefaultFontStyle("Regular",Size)).ColorAndOpacity(Color).WrapTextAt(530);
}
// Saves from before LookVersion 1 used push-up-looks-up as the default. The default is now
// flipped; reset InvertY once so the new default is what the player gets.
void UpgradeSave(UWalkSave* S) { if(S->LookVersion<1){S->InvertY=false;S->LookVersion=1;} }
float AppliedRenderScale() {
    float Normalized, Value, Minimum, Maximum;
    UGameUserSettings::GetGameUserSettings()->GetResolutionScaleInformationEx(Normalized,Value,Minimum,Maximum);
    return Value;
}
int32 GameMonitorIndex() {
    const auto* G=UGameUserSettings::GetGameUserSettings();int32 Index=G->GetClosestMonitorIndex();
    if(!FSlateApplication::IsInitialized()||!GEngine||!GEngine->GameViewport)return Index;
    const auto Window=GEngine->GameViewport->GetWindow();if(!Window)return Index;
    const auto& Metrics=FSlateApplication::Get().GetCachedDisplayMetricsByRef();
    const FSlateRect Bounds=Window->GetRectInScreen();double BestArea=0;
    for(int32 I=0;I<Metrics.MonitorInfo.Num();I++) {
        const auto& R=Metrics.MonitorInfo[I].DisplayRect;
        const double Width=FMath::Max(0.0,FMath::Min((double)Bounds.Right,(double)R.Right)-FMath::Max((double)Bounds.Left,(double)R.Left));
        const double Height=FMath::Max(0.0,FMath::Min((double)Bounds.Bottom,(double)R.Bottom)-FMath::Max((double)Bounds.Top,(double)R.Top));
        if(Width*Height>BestArea){BestArea=Width*Height;Index=I;}
    }
    return Index;
}
void SelectGameMonitor() {
    if(!FSlateApplication::IsInitialized())return;
    const auto& Metrics=FSlateApplication::Get().GetCachedDisplayMetricsByRef();const int32 Index=GameMonitorIndex();
    if(Metrics.MonitorInfo.IsValidIndex(Index))UGameUserSettings::GetGameUserSettings()->SetDisplayProperties(Metrics.MonitorInfo[Index].ID,Index);
}
FIntPoint WindowLimit() {
    FIntPoint Desktop=UGameUserSettings::GetGameUserSettings()->GetDesktopResolution();
    if(Desktop.X<=0||Desktop.Y<=0)Desktop=FIntPoint(1920,1080);
    // Leave room for the taskbar and window frame on the monitor containing
    // the game window; moving it to another monitor changes the available modes.
    FIntPoint Limit(Desktop.X-64,Desktop.Y-96);
    if(FSlateApplication::IsInitialized()) {
        const auto& Metrics=FSlateApplication::Get().GetCachedDisplayMetricsByRef();const int32 Index=GameMonitorIndex();
        if(Metrics.MonitorInfo.IsValidIndex(Index)) {
            const auto& Work=Metrics.MonitorInfo[Index].WorkArea;
            if(Work.Right>Work.Left&&Work.Bottom>Work.Top)Limit=FIntPoint(Work.Right-Work.Left-64,Work.Bottom-Work.Top-56);
        }
    }
    return FIntPoint(FMath::Max(320,Limit.X),FMath::Max(240,Limit.Y));
}
TArray<FIntPoint> WindowChoices() {
    const FIntPoint Limit=WindowLimit();TArray<FIntPoint> Choices;
    for(const FIntPoint P:{FIntPoint(960,540),FIntPoint(1280,720),FIntPoint(1600,900),FIntPoint(1920,1080),FIntPoint(2560,1440),FIntPoint(3840,2160)})
        if(P.X<=Limit.X&&P.Y<=Limit.Y)Choices.Add(P);
    if(Choices.IsEmpty())Choices.Add(Limit);
    return Choices;
}
FIntPoint FitWindow(FIntPoint Requested) {
    const FIntPoint Limit=WindowLimit();
    if(Requested.X>=320&&Requested.Y>=240&&Requested.X<=Limit.X&&Requested.Y<=Limit.Y)return Requested;
    const auto Choices=WindowChoices();FIntPoint Best=Choices[0];
    for(const auto P:Choices)if(P.X<=Requested.X&&P.Y<=Requested.Y)Best=P;
    return Best;
}
void UpgradeDisplaySave(UWalkSave* S,bool Existing) {
    if(S->DisplayVersion<1) {
        if(Existing) {
            S->WindowResolution=UGameUserSettings::GetGameUserSettings()->GetScreenResolution();
            S->RenderScale=AppliedRenderScale();
        }
        S->DisplayVersion=1;
    }
    S->WindowResolution=FitWindow(S->WindowResolution);
    S->RenderScale=FMath::IsFinite(S->RenderScale)?FMath::Clamp(S->RenderScale,50.f,100.f):100.f;
}
FIntPoint ViewportResolution() {
    FVector2D Size=FVector2D::ZeroVector;
    if(GEngine&&GEngine->GameViewport)GEngine->GameViewport->GetViewportSize(Size);
    return FIntPoint(FMath::RoundToInt(Size.X),FMath::RoundToInt(Size.Y));
}
float ScreenPercentage() {
    const auto* CVar=IConsoleManager::Get().FindConsoleVariable(TEXT("r.ScreenPercentage"));
    return CVar?CVar->GetFloat():-1.f;
}
bool ConfiguredHighDpiEnabled() {
    return FPlatformApplicationMisc::IsHighDPIAwarenessEnabled();
}
struct FNativeDpiAwareness {
    int32 Process=-1,Thread=-1,Window=-1;
    uint32 WindowDpi=0;
    bool PerMonitor() const {return Process==2&&Thread==2&&Window==2&&WindowDpi>0;}
};
FNativeDpiAwareness NativeDpiAwareness() {
    FNativeDpiAwareness State;
#if PLATFORM_WINDOWS
    // The engine's generic flag is configuration, not proof that Windows set
    // awareness (notably with -unattended). Unknown API results stay unknown.
    static void* Shcore=FPlatformProcess::GetDllHandle(TEXT("shcore.dll"));
    static void* User32=FPlatformProcess::GetDllHandle(TEXT("user32.dll"));
    using FProcess=HRESULT(WINAPI*)(HANDLE,int*);
    using FThread=HANDLE(WINAPI*)();
    using FWindow=HANDLE(WINAPI*)(HWND);
    using FAwareness=int(WINAPI*)(HANDLE);
    using FWindowDpi=UINT(WINAPI*)(HWND);
    static auto Process=Shcore?reinterpret_cast<FProcess>(FPlatformProcess::GetDllExport(Shcore,TEXT("GetProcessDpiAwareness"))):nullptr;
    static auto Thread=User32?reinterpret_cast<FThread>(FPlatformProcess::GetDllExport(User32,TEXT("GetThreadDpiAwarenessContext"))):nullptr;
    static auto Window=User32?reinterpret_cast<FWindow>(FPlatformProcess::GetDllExport(User32,TEXT("GetWindowDpiAwarenessContext"))):nullptr;
    static auto Awareness=User32?reinterpret_cast<FAwareness>(FPlatformProcess::GetDllExport(User32,TEXT("GetAwarenessFromDpiAwarenessContext"))):nullptr;
    static auto Dpi=User32?reinterpret_cast<FWindowDpi>(FPlatformProcess::GetDllExport(User32,TEXT("GetDpiForWindow"))):nullptr;
    if(Process&&!SUCCEEDED(Process(nullptr,&State.Process)))State.Process=-1;
    if(Thread&&Awareness)State.Thread=Awareness(Thread());
    const auto SlateWindow=GEngine&&GEngine->GameViewport?GEngine->GameViewport->GetWindow():TSharedPtr<SWindow>();
    if(SlateWindow&&SlateWindow->GetNativeWindow()) {
        const auto Handle=static_cast<HWND>(SlateWindow->GetNativeWindow()->GetOSWindowHandle());
        if(Handle){if(Window&&Awareness)State.Window=Awareness(Window(Handle));if(Dpi)State.WindowDpi=Dpi(Handle);}
    }
#endif
    return State;
}
float WindowDpiScale() {
    const auto Window=GEngine&&GEngine->GameViewport?GEngine->GameViewport->GetWindow():TSharedPtr<SWindow>();
    return Window?Window->GetDPIScaleFactor():0.f;
}
bool DisplayMatches(const UWalkSave* S) {
    const auto* G=UGameUserSettings::GetGameUserSettings();
    const FIntPoint Wanted=S->Fullscreen?G->GetDesktopResolution():S->WindowResolution;
    return ViewportResolution()==Wanted&&G->GetScreenResolution()==Wanted
        &&G->GetFullscreenMode()==(S->Fullscreen?EWindowMode::WindowedFullscreen:EWindowMode::Windowed)
        &&FMath::IsNearlyEqual(AppliedRenderScale(),S->RenderScale,.01f)
        &&FMath::IsNearlyEqual(ScreenPercentage(),S->RenderScale,.01f)
        &&G->GetFrameRateLimit()==60&&G->IsVSyncEnabled()&&!G->IsDynamicResolutionEnabled();
}
}

class SQuietMenu : public SCompoundWidget {
public:
    SLATE_BEGIN_ARGS(SQuietMenu) {} SLATE_ARGUMENT(AWalkController*, Owner) SLATE_END_ARGS()
    TWeakObjectPtr<AWalkController> Owner;
    TArray<TSharedPtr<SButton>> Buttons;
    TSharedPtr<SVerticalBox> Rows;
    TSharedPtr<SScrollBox> Scroll;
    TSharedPtr<SMultiLineEditableTextBox> NoteBox;
    void Construct(const FArguments& Args) {
        Owner=Args._Owner;
        ChildSlot [ SNew(SBorder).BorderImage(FCoreStyle::Get().GetBrush("WhiteBrush")).BorderBackgroundColor(FLinearColor(0.008f,.018f,.016f,.28f)).Padding(0)
            [ SNew(SScaleBox).Stretch(EStretch::ScaleToFit).HAlign(HAlign_Left).VAlign(VAlign_Center)
              [ SNew(SBox).WidthOverride(660).HeightOverride(850)
                [ SNew(SBorder).BorderImage(FCoreStyle::Get().GetBrush("WhiteBrush")).BorderBackgroundColor(FLinearColor(.012f,.025f,.022f,.96f)).Padding(FMargin(65,40))
                  [ SAssignNew(Scroll,SScrollBox).ScrollWhenFocusChanges(EScrollWhenFocusChanges::InstantScroll)
                    + SScrollBox::Slot()[ SAssignNew(Rows,SVerticalBox) ] ] ] ] ] ];
        Build();
    }
    virtual bool SupportsKeyboardFocus() const override { return true; }
    virtual FReply OnKeyDown(const FGeometry& G,const FKeyEvent& E) override {
        const FKey K=E.GetKey();
        // Not on key repeat: a held B / Esc that opened this page must not also back out of it.
        if(K==EKeys::Escape||K==EKeys::Gamepad_FaceButton_Right||K==EKeys::Gamepad_Special_Right) { if(Owner.IsValid()&&!E.IsRepeat()) Owner->Back(); return FReply::Handled(); }
        if(K==EKeys::Down||K==EKeys::Up||K==EKeys::Gamepad_DPad_Down||K==EKeys::Gamepad_DPad_Up) {
            int32 N=0; for(int32 I=0;I<Buttons.Num();I++) if(Buttons[I]->HasKeyboardFocus()) N=I;
            N=(N+((K==EKeys::Down||K==EKeys::Gamepad_DPad_Down)?1:-1)+Buttons.Num())%Buttons.Num();
            FSlateApplication::Get().SetKeyboardFocus(Buttons[N]); return FReply::Handled();
        }
        return SCompoundWidget::OnKeyDown(G,E);
    }
    void Add(const FString& Text,const FString& Id) {
        TSharedPtr<SButton> B;
        Rows->AddSlot().AutoHeight().Padding(0,4)
        [ SAssignNew(B,SButton).ContentPadding(FMargin(18,10)).HAlign(HAlign_Left)
          .ButtonColorAndOpacity(FLinearColor(.05f,.09f,.075f,1))
          .OnClicked_Lambda([Weak=Owner,Id](){ if(Weak.IsValid()) Weak->Action(Id); return FReply::Handled(); })
          [ Label(Text,19) ] ]; Buttons.Add(B);
    }
    void Heading(const FString& Title,const FString& Sub) {
        Rows->AddSlot().AutoHeight().Padding(0,0,0,10)[Label(TEXT("SHANKARANARAYANA"),13,Gold)];
        Rows->AddSlot().AutoHeight().Padding(0,0,0,12)[Label(Title,34)];
        Rows->AddSlot().AutoHeight().Padding(0,0,0,22)[Label(Sub,16,Muted)];
    }
    void Build() {
        auto* O=Owner.Get(); if(!O)return; UWalkSave* S=O->Save.Get();
        if(O->Page=="home") {
            Heading(TEXT("A quiet walk"),TEXT("A house, a temple, a lake.\nTake your time; there is no wrong turn."));
            if(S->HasWalk) Add(TEXT("Continue your walk"),"continue");
            Add(S->HasWalk?TEXT("Begin a new walk"):TEXT("Begin your walk"),"new");
            if(O->TourPosition.Num()>1) Add(TEXT("Return to the guided tour"),"tour");
            if(!O->PhotoDir.IsEmpty()) Add(TEXT("Photo alignment"),"photos");
            Add(TEXT("Settings"),"settings"); Add(TEXT("How to walk"),"controls"); Add(TEXT("Quit"),"quit");
            Rows->AddSlot().AutoHeight().Padding(0,24,0,0)[Label(TEXT("A reconstruction from photographs, 2011–2013.\nSome spaces and details are approximate."),14,Muted)];
        } else if(O->Page=="pause") {
            Heading(TEXT("Take a breath"),TEXT("Your walk is paused."));
            Add(TEXT("Resume"),"resume"); Add(TEXT("Places journal"),"journal"); Add(TEXT("Leave a note here"),"walknote");
            if(!O->PhotoDir.IsEmpty()) Add(TEXT("Photo alignment"),"photos");
            if(O->TourPosition.Num()>1) Add(TEXT("Watch the guided tour"),"tour"); Add(TEXT("Settings"),"settings"); Add(TEXT("How to walk"),"controls");
            Add(TEXT("Return to the house entrance"),"rescue"); Add(TEXT("Save & return to title"),"title"); Add(TEXT("Save & quit"),"quit");
        } else if(O->Page=="settings") {
            Heading(TEXT("Settings"),TEXT("Comfort, sound and display. Saved automatically."));
            Add(FString::Printf(TEXT("Look sensitivity     %.1f ×"),S->Sensitivity),"sensitivity");
            Add(FString::Printf(TEXT("Field of view           %.0f°"),S->Fov),"fov");
            Add(FString::Printf(TEXT("Invert vertical look   %s"),S->InvertY?TEXT("On"):TEXT("Off")),"invert");
            Add(FString::Printf(TEXT("Gentle guidance        %s"),S->Guidance?TEXT("On"):TEXT("Off")),"guidance");
            Add(FString::Printf(TEXT("Sound                       %.0f%%"),S->Volume*100),"volume");
            const TCHAR* Quality[]={TEXT("Low"),TEXT("Medium"),TEXT("High"),TEXT("Epic")};
            Add(FString::Printf(TEXT("Graphics                   %s"),Quality[S->Quality]),"quality");
            Add(S->Fullscreen?TEXT("Display                      Borderless"):TEXT("Display                      Windowed"),"display");
            Add(FString::Printf(TEXT("Window resolution   %d × %d"),S->WindowResolution.X,S->WindowResolution.Y),"resolution");
            Add(FString::Printf(TEXT("Render scale             %.0f%%"),S->RenderScale),"render-scale");
            Add(TEXT("Restore default settings"),"defaults"); Add(TEXT("Back"),"back");
            Rows->AddSlot().AutoHeight().Padding(0,10)
                [SNew(STextBlock).Text_Lambda([Weak=Owner](){return Txt(Weak.IsValid()?Weak->DisplayStatus():FString());})
                 .Font(FCoreStyle::GetDefaultFontStyle("Regular",13)).ColorAndOpacity(Muted).AutoWrapText(true)];
        } else if(O->Page=="controls") {
            Heading(TEXT("How to walk"),TEXT("Mouse & keyboard, or a controller."));
            Rows->AddSlot().AutoHeight().Padding(0,0,0,24)[Label(TEXT("W A S D / left stick     Walk\nMouse / right stick      Look around\nShift / right trigger      Walk a little faster\nE / A                            Notice a place\nJ / Y                             Places journal\nEsc / Menu                  Pause & resume\n\nPhoto alignment (in the menus) flies a free camera beside a photograph; its keys and controller buttons are shown on screen.\n\nThe guided tour plays on launch. Walk or move a stick to leave it and walk on from there.\n\nIn menus: arrows or D-pad, Enter / A to select, Esc / B to go back.\n\nStairs are walked, not jumped. If you lose your way, use Return to the house entrance from Pause.\n\nProgress saves while walking, when you notice a place, and when you leave."),18)];
            Add(TEXT("Back"),"back");
        } else if(O->Page=="journal") {
            Heading(TEXT("Places along the way"),FString::Printf(TEXT("%d of %d noticed. Visit in any order."),S->Visited.Num(),O->Places.Num()));
            for(int32 I=0;I<O->Places.Num();I++) {
                const auto& P=O->Places[I]; bool Seen=S->Visited.Contains(P.Id);
                Add((Seen?TEXT("✓  "):TEXT("○  "))+P.Title,FString::Printf(TEXT("place:%d"),I));
            }
            Add(TEXT("Back"),"back");
        } else if(O->Page.StartsWith("place:")) {
            int32 I=FCString::Atoi(*O->Page.Mid(6)); if(!O->Places.IsValidIndex(I)) I=0;
            const auto& P=O->Places[I]; bool Seen=S->Visited.Contains(P.Id);
            Heading(P.Title,Seen?TEXT("A place you have noticed."):TEXT("Still to discover."));
            Rows->AddSlot().AutoHeight().Padding(0,0,0,30)[Label(Seen?P.Note:TEXT("Follow the lane and explore at your own pace. When you reach this place, pause for a moment with E / A."),20)];
            if(Seen) Add(TEXT("Return to this place"),FString::Printf(TEXT("travel:%d"),I));
            Add(TEXT("Back to journal"),"journal");
        } else if(O->Page=="photos") {
            int32 Done=0; for(const auto& F:O->PhotoFiles) if(O->PoseFor(F).IsValid()) Done++;
            const int32 Pages=FMath::Max(1,(O->PhotoFiles.Num()+O->PhotosPerPage-1)/O->PhotosPerPage);
            Heading(TEXT("Photo alignment"),FString::Printf(TEXT("%d photographs, %d aligned.  Page %d of %d."),O->PhotoFiles.Num(),Done,O->PhotoPage+1,Pages));
            for(int32 I=O->PhotoPage*O->PhotosPerPage;I<FMath::Min(O->PhotoFiles.Num(),(O->PhotoPage+1)*O->PhotosPerPage);I++) {
                const auto R=O->PoseFor(O->PhotoFiles[I]); const FString Note=O->PhotoNote(O->PhotoFiles[I]);
                Add((R.IsValid()?TEXT("✓  "):TEXT("○  "))+FPaths::GetBaseFilename(O->PhotoFiles[I])+(Note.IsEmpty()?TEXT(""):TEXT("   ✎")),FString::Printf(TEXT("photo:%d"),I));
            }
            if(O->PhotoPage+1<Pages) Add(TEXT("Next page"),"photos-next");
            if(O->PhotoPage>0) Add(TEXT("Previous page"),"photos-prev");
            Add(TEXT("Back"),"back");
        } else if(O->Page.StartsWith("photo:")) {
            const FString File=O->PhotoName(),Note=O->PhotoNote(File); const auto R=O->PoseFor(File); FString When;
            if(R.IsValid())R->TryGetStringField(TEXT("savedAt"),When);
            Heading(FPaths::GetBaseFilename(File),R.IsValid()?TEXT("Aligned ")+When.Left(10)+TEXT("."):TEXT("No saved alignment yet."));
            if(O->PhotoBrush.IsValid()&&O->PhotoTexture) Rows->AddSlot().AutoHeight().Padding(0,0,0,14)
                [SNew(SBox).WidthOverride(530).HeightOverride(FMath::Min(300.f,530/O->AlignAspect))[SNew(SScaleBox).Stretch(EStretch::ScaleToFit)[SNew(SImage).Image(O->PhotoBrush.Get())]]];
            if(!Note.IsEmpty()) Rows->AddSlot().AutoHeight().Padding(0,0,0,14)[Label(TEXT("Note: ")+Note,15,Muted)];
            if(R.IsValid()) Add(TEXT("Go to saved position"),"align-saved");
            Add(R.IsValid()?TEXT("Align again from the current view"):TEXT("Align from the current view"),"align-here");
            Add(Note.IsEmpty()?TEXT("Add a note"):TEXT("Edit the note"),"note"); Add(TEXT("Back to photographs"),"photos");
        } else if(O->Page=="note"||O->Page=="walknote") {
            const bool Walk=O->Page=="walknote";
            Heading(Walk?TEXT("Leave a note here"):TEXT("Note"),Walk?TEXT("Saved with where you stand and where you are looking."):FPaths::GetBaseFilename(O->PhotoName()));
            Rows->AddSlot().AutoHeight().Padding(0,0,0,16)
                [SNew(SBox).HeightOverride(220)[SAssignNew(NoteBox,SMultiLineEditableTextBox).Text(Txt(O->NoteDraft)).AutoWrapText(true)
                  .Font(FCoreStyle::GetDefaultFontStyle("Regular",15)).HintText(Txt(TEXT("Type your note…")))
                  .OnTextChanged_Lambda([Weak=Owner](const FText& T){if(Weak.IsValid())Weak->NoteDraft=T.ToString();})]];
            Add(TEXT("Save note"),Walk?"walknote-save":"note-save"); Add(TEXT("Cancel"),"back");
        } else if(O->Page=="new-confirm") {
            Heading(TEXT("Begin again?"),TEXT("This replaces your saved walk and places journal. Your settings stay."));
            Add(TEXT("Keep my current walk"),"back"); Add(TEXT("Begin a new walk"),"new-confirmed");
        }
        Rows->AddSlot().FillHeight(1);
        Rows->AddSlot().AutoHeight().Padding(0,20,0,0)
            [SNew(STextBlock).Text_Lambda([Weak=Owner](){auto* C=Weak.Get();return Txt(C&&FPlatformTime::Seconds()<C->ToastUntil?C->Toast:TEXT("↑ ↓   Choose      Enter / A   Select      Esc / B   Back"));})
             .Font(FCoreStyle::GetDefaultFontStyle("Regular",13)).ColorAndOpacity(Muted).AutoWrapText(true)];
    }
    void Focus(int32 Index=0) { if(NoteBox.IsValid()&&Index==0){FSlateApplication::Get().SetKeyboardFocus(NoteBox,EFocusCause::SetDirectly);return;} if(Buttons.Num()) FSlateApplication::Get().SetKeyboardFocus(Buttons[FMath::Clamp(Index,0,Buttons.Num()-1)],EFocusCause::SetDirectly); }
};

AWalkGameMode::AWalkGameMode() { DefaultPawnClass=AWalkCharacter::StaticClass(); PlayerControllerClass=AWalkController::StaticClass(); }
AWalkCharacter::AWalkCharacter() {
    GetCapsuleComponent()->InitCapsuleSize(22,88);
    Camera=CreateDefaultSubobject<UCameraComponent>(TEXT("Eyes")); Camera->SetupAttachment(GetCapsuleComponent());
    Camera->SetRelativeLocation(FVector(0,0,74)); Camera->bUsePawnControlRotation=true;
    auto* M=GetCharacterMovement(); M->MaxWalkSpeed=180; M->MaxStepHeight=36; M->SetWalkableFloorAngle(48); M->BrakingDecelerationWalking=900; M->MaxAcceleration=700;
    bUseControllerRotationYaw=true;
}
void AWalkCharacter::SetupPlayerInputComponent(UInputComponent* I) {
    Super::SetupPlayerInputComponent(I);
    I->BindAxis("WalkForward",this,&AWalkCharacter::Forward); I->BindAxis("WalkRight",this,&AWalkCharacter::Right);
    I->BindAxis("WalkLookX",this,&AWalkCharacter::LookX); I->BindAxis("WalkLookY",this,&AWalkCharacter::LookY);
    I->BindAxis("WalkStickX",this,&AWalkCharacter::StickX); I->BindAxis("WalkStickY",this,&AWalkCharacter::StickY);
    I->BindKey(EKeys::LeftShift,IE_Pressed,this,&AWalkCharacter::Brisk); I->BindKey(EKeys::LeftShift,IE_Released,this,&AWalkCharacter::Slow);
    I->BindKey(EKeys::Gamepad_RightTrigger,IE_Pressed,this,&AWalkCharacter::Brisk); I->BindKey(EKeys::Gamepad_RightTrigger,IE_Released,this,&AWalkCharacter::Slow);
}
// While the guided tour plays, walking input (keys or either stick) leaves it and walks on
// from the tour camera's spot; the mouse alone does not, so a nudge cannot end the tour.
static bool Touring(AController* Controller,float V,bool TakesOver) {
    auto* C=Cast<AWalkController>(Controller); if(!C) return false;
    if(C->Aligning) return true;  // the alignment camera takes the input instead (see Aligner)
    if(C->Walking) return false;
    if(TakesOver&&FMath::Abs(V)>.25f) C->TakeOver();
    return !C->Walking;
}
static AWalkController* Aligner(AController* Controller){auto* C=Cast<AWalkController>(Controller);return C&&C->Aligning&&C->Page.IsEmpty()?C:nullptr;}
void AWalkCharacter::Forward(float V) { if(auto* A=Aligner(Controller))A->AlignMove.X=V; if(Touring(Controller,V,true))return; AddMovementInput(FRotationMatrix(FRotator(0,GetControlRotation().Yaw,0)).GetUnitAxis(EAxis::X),V); }
void AWalkCharacter::Right(float V) { if(auto* A=Aligner(Controller))A->AlignMove.Y=V; if(Touring(Controller,V,true))return; AddMovementInput(FRotationMatrix(FRotator(0,GetControlRotation().Yaw,0)).GetUnitAxis(EAxis::Y),V); }
void AWalkCharacter::LookX(float V) { if(auto* A=Aligner(Controller))A->AlignTurn(V*A->Save->Sensitivity*2.f,0); if(Touring(Controller,V,false))return; if(auto* C=Cast<AWalkController>(Controller)) AddControllerYawInput(V*C->Save->Sensitivity*2.0f); }
// Default vertical look: pushing the mouse or right stick up looks down. InvertY flips it.
void AWalkCharacter::LookY(float V) { if(auto* A=Aligner(Controller))A->AlignTurn(0,V*A->Save->Sensitivity*(A->Save->InvertY?2.f:-2.f)); if(Touring(Controller,V,false))return; if(auto* C=Cast<AWalkController>(Controller)) AddControllerPitchInput(V*C->Save->Sensitivity*(C->Save->InvertY?2.f:-2.f)); }
void AWalkCharacter::StickX(float V) { if(auto* A=Aligner(Controller))A->AlignTurn(V*GetWorld()->GetDeltaSeconds()*90*A->Save->Sensitivity,0); if(Touring(Controller,V,true))return; if(auto* C=Cast<AWalkController>(Controller)) AddControllerYawInput(V*GetWorld()->GetDeltaSeconds()*90*C->Save->Sensitivity); }
void AWalkCharacter::StickY(float V) { if(auto* A=Aligner(Controller))A->AlignTurn(0,V*GetWorld()->GetDeltaSeconds()*70*A->Save->Sensitivity*(A->Save->InvertY?1:-1)); if(Touring(Controller,V,true))return; if(auto* C=Cast<AWalkController>(Controller)) AddControllerPitchInput(V*GetWorld()->GetDeltaSeconds()*70*C->Save->Sensitivity*(C->Save->InvertY?1:-1)); }
void AWalkCharacter::Brisk(){GetCharacterMovement()->MaxWalkSpeed=300;}
void AWalkCharacter::Slow(){GetCharacterMovement()->MaxWalkSpeed=180;}

FString AWalkController::Slot() const { return WaterProbe?TEXT("QuietWalkWaterProbe"):Smoke?TEXT("QuietWalkSmoke"):TEXT("QuietWalk"); }
void AWalkController::BeginPlay() {
    Super::BeginPlay(); bShouldPerformFullTickWhenPaused=true; PrimaryActorTick.bTickEvenWhenPaused=true; BeginTime=FPlatformTime::Seconds();
    WaterProbe=FParse::Param(FCommandLine::Get(),TEXT("WalkWaterProbe"));
    ResumeSmoke=!WaterProbe&&FParse::Param(FCommandLine::Get(),TEXT("WalkSmokeResume"));
    Smoke=!WaterProbe&&(ResumeSmoke||FParse::Param(FCommandLine::Get(),TEXT("WalkSmoke")));
    Save=(WaterProbe||(Smoke&&!ResumeSmoke))?nullptr:Cast<UWalkSave>(UGameplayStatics::LoadGameFromSlot(Slot(),0));
    const bool ExistingSave=Save&&Save->Version==1;
    if(!ExistingSave) Save=Cast<UWalkSave>(UGameplayStatics::CreateSaveGameObject(UWalkSave::StaticClass()));
    UpgradeSave(Save);
    UpgradeDisplaySave(Save,ExistingSave);
    if(WaterProbe){FString Isolation;if(!FParse::Value(FCommandLine::Get(),TEXT("UserDir="),Isolation)||Isolation.IsEmpty()){
        WaterProbeFinished=true;
        UE_LOG(LogTemp,Error,TEXT("WATERPROBE requires an isolated -UserDir=<folder>; no probe report or game settings will be written."));
        UKismetSystemLibrary::QuitGame(this,this,EQuitPreference::Quit,false);return;
    }}
    Save->Sensitivity=FMath::Clamp(Save->Sensitivity,.5f,2.f); Save->Fov=FMath::Clamp(Save->Fov,70.f,100.f); Save->Volume=FMath::Clamp(Save->Volume,0.f,1.f); Save->Quality=FMath::Clamp(Save->Quality,0,3);
    // Feet positions come from the authored web viewpoints, in centimetres (x,z,y).
    // The temple complex stands 4.5 m back from the lane (K.templeShiftZ in the web model), so its
    // three places carry that offset.
    Places={
        {"house",TEXT("The house entrance"),TEXT("Two raised sitting platforms flank the entrance. Notice the timber supports, red floor and the lower passage between them."),FVector(-380,-200,0),90},
        {"courtyard",TEXT("The inner courtyard"),TEXT("The roof opens to the sky. Look for the Tulsi and the covered passages around this smaller, quieter court."),FVector(-720,685,3.5),90},
        {"temple",TEXT("The temple entrance"),TEXT("The lane opens toward the temple. Look up at the layered roof before going through the entrance."),FVector(4230,-200,5.1),125},
        {"court",TEXT("The temple courtyard"),TEXT("Follow the covered edge of the courtyard. Columns, changing floor levels and the Tulsi organize the open space."),FVector(3000,1850,10),15},
        {"rear",TEXT("The rear veranda"),TEXT("At the far end of the circuit, the upper screened room and small dome sit above the ground-floor bays."),FVector(3150,3650,10),90},
        {"pavilion",TEXT("The lakeside pavilion"),TEXT("The steps descend toward the water. Pause here to see how the temple and the lake face one another."),FVector(3400,-3400,-127),90},
        {"lake",TEXT("Across the lake"),TEXT("From the opposite bank, the water opens a long view back toward the roofs and the temple."),FVector(-700,-3600,200),45}
    };
    // A reference viewpoint can float above the actual walking surface. Resolve
    // discovery height against the same collision mesh used by the character.
    for(auto& Place:Places){FHitResult Hit;FCollisionQueryParams Params;Params.AddIgnoredActor(GetPawn());
        if(GetWorld()->LineTraceSingleByChannel(Hit,Place.Feet+FVector(0,0,130),Place.Feet-FVector(0,0,400),ECC_Visibility,Params)&&Hit.Normal.Z>.65)Place.Feet.Z=Hit.Location.Z;
    }
    Save->Visited.RemoveAll([this](const FString& Id){return !Places.ContainsByPredicate([&](const FWalkPlace& P){return P.Id==Id;});});
    ApplySettings();
    if(PlayerCameraManager) { PlayerCameraManager->ViewPitchMin=-75; PlayerCameraManager->ViewPitchMax=75; }
    if(auto* Sound=LoadObject<USoundWave>(nullptr,TEXT("/Game/WalkAudio/Ambience.Ambience"))) Ambience=UGameplayStatics::SpawnSound2D(this,Sound,Save->Volume,1,0,nullptr,true,false);
    Hud=SNew(SOverlay)
        + SOverlay::Slot().HAlign(HAlign_Left).VAlign(VAlign_Top).Padding(32,26)
          [SNew(SBorder).BorderImage(FCoreStyle::Get().GetBrush("WhiteBrush")).BorderBackgroundColor(FLinearColor(.01f,.025f,.02f,.78f)).Padding(14)
           .Visibility_Lambda([this](){return Page.IsEmpty()&&Walking&&!Aligning&&Save->Guidance?EVisibility::HitTestInvisible:EVisibility::Collapsed;})
           [SNew(STextBlock).Text_Lambda([this](){return Txt(Status());}).Font(FCoreStyle::GetDefaultFontStyle("Regular",16)).ColorAndOpacity(Cream)]]
        + SOverlay::Slot().HAlign(HAlign_Center).VAlign(VAlign_Bottom).Padding(24,28)
          [SNew(STextBlock).Text_Lambda([this](){return Txt(Prompt());}).Font(FCoreStyle::GetDefaultFontStyle("Regular",18)).ColorAndOpacity(Cream).ShadowOffset(FVector2D(1,1)).ShadowColorAndOpacity(FLinearColor::Black)];
    GEngine->GameViewport->AddViewportWidgetContent(Hud.ToSharedRef(),1); Hud->SetVisibility(EVisibility::HitTestInvisible);
    // The private photographs stay outside the package: -WalkPhotos=<folder>, else the usual folder.
    if(!WaterProbe&&!FParse::Value(FCommandLine::Get(),TEXT("WalkPhotos="),PhotoDir)) PhotoDir=TEXT("F:/Shankaranarayana");
    if(Smoke){
        // The smoke run aligns generated pictures (one landscape, one portrait) in its own folder, never the real poses.
        PhotoDir=FPaths::ConvertRelativePathToFull(FPaths::ProjectSavedDir()/TEXT("WalkReview/align-smoke"));IFileManager::Get().DeleteDirectory(*PhotoDir,false,true);IFileManager::Get().MakeDirectory(*PhotoDir,true);
        TArray<FColor> Pixels;Pixels.Init(FColor(120,150,110),64*48);TArray64<uint8> Png;FImageUtils::PNGCompressImageArray(64,48,TArrayView64<const FColor>(Pixels.GetData(),Pixels.Num()),Png);
        FFileHelper::SaveArrayToFile(Png,*(PhotoDir/TEXT("smoke photo.png")));
        Png.Reset();FImageUtils::PNGCompressImageArray(48,64,TArrayView64<const FColor>(Pixels.GetData(),Pixels.Num()),Png);
        FFileHelper::SaveArrayToFile(Png,*(PhotoDir/TEXT("smoke second.png")));
    }
    if(!PhotoDir.IsEmpty()&&!IFileManager::Get().DirectoryExists(*PhotoDir)) PhotoDir.Empty();
    if(!Smoke&&!WaterProbe)FParse::Value(FCommandLine::Get(),TEXT("WalkReviewPhoto="),ReviewPhoto);
    PhotoBrush=MakeShared<FSlateBrush>();
    AlignHud=SNew(SOverlay)
        + SOverlay::Slot().HAlign(HAlign_Fill).VAlign(VAlign_Fill)
          [SNew(SScaleBox).Stretch(EStretch::ScaleToFit).Visibility_Lambda([this](){return Aligning&&AlignOverlay&&Page.IsEmpty()?EVisibility::HitTestInvisible:EVisibility::Collapsed;})
           [SNew(SImage).Image(PhotoBrush.Get()).ColorAndOpacity(FLinearColor(1,1,1,.5f))]]
        + SOverlay::Slot().HAlign(HAlign_Right).VAlign(VAlign_Top).Padding(24)
          [SNew(SBox).WidthOverride(440).HeightOverride_Lambda([this](){return FOptionalSize(440.f/AlignAspect);})
           .Visibility_Lambda([this](){return Aligning&&!AlignOverlay&&Page.IsEmpty()?EVisibility::HitTestInvisible:EVisibility::Collapsed;})
           [SNew(SBorder).BorderImage(FCoreStyle::Get().GetBrush("WhiteBrush")).BorderBackgroundColor(FLinearColor(.01f,.02f,.018f,.9f)).Padding(4)[SNew(SImage).Image(PhotoBrush.Get())]]];
    GEngine->GameViewport->AddViewportWidgetContent(AlignHud.ToSharedRef(),2); AlignHud->SetVisibility(EVisibility::HitTestInvisible);
    TitleCamera=GetWorld()->SpawnActor<ACameraActor>(FVector(-700,-3700,300),FRotator(-3,35,0));
    if(TitleCamera)TitleCamera->GetCameraComponent()->SetFieldOfView(75);
    Travel(0);
    // Like the web app: open straight into the guided tour; Esc / Menu brings up the menu.
    if(LoadTour()){TourShownAt=FPlatformTime::Seconds();TickTour(0);Show("");}else{UE_LOG(LogTemp,Warning,TEXT("QUIETWALK tour missing: Content/Tour/tour.json"));Show("home");}
    UE_LOG(LogTemp,Display,TEXT("QUIETWALK ready: guided tour, native menus, walking, journal and saves"));
}
void AWalkController::EndPlay(const EEndPlayReason::Type R) {
    if(Save&&Walking&&!Smoke&&!WaterProbe) Persist(true);
    if(GEngine&&GEngine->GameViewport) {if(Menu)GEngine->GameViewport->RemoveViewportWidgetContent(Menu.ToSharedRef()); if(Hud)GEngine->GameViewport->RemoveViewportWidgetContent(Hud.ToSharedRef()); if(AlignHud)GEngine->GameViewport->RemoveViewportWidgetContent(AlignHud.ToSharedRef());}
    Super::EndPlay(R);
}
void AWalkController::SetupInputComponent() {
    Super::SetupInputComponent();
    InputComponent->BindKey(EKeys::Escape,IE_Pressed,this,&AWalkController::PauseWalk).bExecuteWhenPaused=true;
    InputComponent->BindKey(EKeys::Gamepad_Special_Right,IE_Pressed,this,&AWalkController::PauseWalk).bExecuteWhenPaused=true;
    InputComponent->BindKey(EKeys::J,IE_Pressed,this,&AWalkController::OpenJournal);
    InputComponent->BindKey(EKeys::Gamepad_FaceButton_Top,IE_Pressed,this,&AWalkController::OpenJournal);
    InputComponent->BindKey(EKeys::E,IE_Pressed,this,&AWalkController::Observe);
    InputComponent->BindKey(EKeys::Gamepad_FaceButton_Bottom,IE_Pressed,this,&AWalkController::Observe);
}
void AWalkController::Show(const FString& P) {
    if(P=="photos"||P.StartsWith("photo:"))LoadPoses();
    int32 FocusIndex=0;
    if(Menu&&Page==P)for(int32 I=0;I<Menu->Buttons.Num();I++)if(Menu->Buttons[I]->HasKeyboardFocus())FocusIndex=I;
    if(Menu) { GEngine->GameViewport->RemoveViewportWidgetContent(Menu.ToSharedRef()); Menu.Reset(); }
    Page=P; bool Open=!P.IsEmpty(); SetPause(Open&&(Walking||TourPosition.Num()>1)); bShowMouseCursor=Open;
    if(Aligning&&AlignCamera)SetViewTarget(AlignCamera);else if(!Walking&&TitleCamera)SetViewTarget(TitleCamera);else if(GetPawn())SetViewTarget(GetPawn());
    ResetIgnoreMoveInput();ResetIgnoreLookInput();SetIgnoreMoveInput(Open);SetIgnoreLookInput(Open);
    FocusAt=FPlatformTime::Seconds()+.3;PendingFocus=FocusIndex;
    if(auto* C=Cast<AWalkCharacter>(GetPawn())) {C->Slow();C->GetCharacterMovement()->StopMovementImmediately();}
    FlushPressedKeys();
    if(Open) { Menu=SNew(SQuietMenu).Owner(this); GEngine->GameViewport->AddViewportWidgetContent(Menu.ToSharedRef(),10); FInputModeUIOnly M; M.SetWidgetToFocus(Menu); M.SetLockMouseToViewportBehavior(EMouseLockMode::DoNotLock); SetInputMode(M); Menu->Focus(FocusIndex); }
    else {SetInputMode(FInputModeGameOnly()); FSlateApplication::Get().SetAllUserFocusToGameViewport();}
}
void AWalkController::Back(){
    if(Page=="home"){if(!Walking&&TourPosition.Num()>1)Show("");return;}
    if(Page=="pause")Show("");else if(Page.StartsWith("place:"))Show("journal");
    else if(Page.StartsWith("photo:"))Action("photos");
    else if(Page=="note")Show(FString::Printf(TEXT("photo:%d"),PhotoIndex));
    else{if(Page=="photos")StopAlign();Show(Walking?"pause":"home");}
}
void AWalkController::PauseWalk(){if(Aligning&&Page.IsEmpty()){Show(FString::Printf(TEXT("photo:%d"),PhotoIndex));return;}if(Walking){if(Page.IsEmpty())Show("pause");else Back();}else if(Page.IsEmpty())Show("home");else Back();}
void AWalkController::OpenJournal(){if(Walking&&!Aligning)Show("journal");}
void AWalkController::Notify(const FString& T){Toast=T;ToastUntil=FPlatformTime::Seconds()+6;}
bool AWalkController::RestorePosition(FVector P, FRotator R) {
    auto* C=Cast<AWalkCharacter>(GetPawn()); if(!C||P.ContainsNaN()||R.ContainsNaN()||P.Size()>100000)return false;
    FHitResult Hit; FCollisionQueryParams Params;Params.AddIgnoredActor(C);
    if(!GetWorld()->LineTraceSingleByChannel(Hit,P+FVector(0,0,40),P-FVector(0,0,400),ECC_Visibility,Params)||Hit.Normal.Z<.65){if(Smoke)UE_LOG(LogTemp,Warning,TEXT("WALKLAND no floor at %s hit %s normal %s"),*P.ToString(),*Hit.Location.ToString(),*Hit.Normal.ToString());return false;}
    FVector Center=Hit.Location+FVector(0,0,90);
    if(C->GetActorLocation().Equals(Center,3)){SetControlRotation(R);return true;}
    if(!C->TeleportTo(Center,FRotator(0,R.Yaw,0),false,false)){if(Smoke)UE_LOG(LogTemp,Warning,TEXT("WALKLAND capsule blocked at %s"),*Center.ToString());return false;}
    C->GetCharacterMovement()->StopMovementImmediately();C->GetCharacterMovement()->SetMovementMode(MOVE_Walking);SetControlRotation(R);return true;
}
bool AWalkController::Travel(int32 I) {
    if(!Places.IsValidIndex(I))return false;
    const auto& P=Places[I];return RestorePosition(P.Feet+FVector(0,0,90),FRotator(0,P.Yaw,0));
}
void AWalkController::StartWalk(bool Continue) {
    StopAlign();
    if(!Continue){Save->Visited.Empty();if(!Travel(0)){Notify(TEXT("Entrance unavailable. Please reload the walk."));return;}}
    else if(!RestorePosition(Save->Position,Save->Look)){Travel(0);Notify(TEXT("Returned to the entrance; your journal is safe."));}
    Walking=true;Save->HasWalk=true;Show("");Persist(true);Notify(TEXT("WASD / left stick to walk · Look around · Esc / Menu to pause"));
}
bool AWalkController::Persist(bool Capture) {
    if(WaterProbe)return true;
    auto* C=Cast<AWalkCharacter>(GetPawn());
    if(Capture&&C&&Walking&&C->GetCharacterMovement()->IsMovingOnGround()){Save->Position=C->GetActorLocation();Save->Look=GetControlRotation();}
    bool Ok=UGameplayStatics::SaveGameToSlot(Save,Slot(),0);if(!Ok)Notify(TEXT("Could not save your walk. Check available disk space."));return Ok;
}
void AWalkController::ApplySettings() {
    if(auto* C=Cast<AWalkCharacter>(GetPawn())) C->Camera->SetFieldOfView(Save->Fov);
    auto* G=UGameUserSettings::GetGameUserSettings();G->SetOverallScalabilityLevel(Save->Quality);G->SetFrameRateLimit(60);G->SetVSyncEnabled(true);
    SelectGameMonitor();Save->WindowResolution=FitWindow(Save->WindowResolution);
    G->SetFullscreenMode(Save->Fullscreen?EWindowMode::WindowedFullscreen:EWindowMode::Windowed);
    G->SetScreenResolution(Save->Fullscreen?G->GetDesktopResolution():Save->WindowResolution);
    // Scalability replaces its resolution quality, so set our independent scale last.
    G->SetResolutionScaleValueEx(Save->RenderScale);G->SetDynamicResolutionEnabled(false);
    G->ConfirmVideoMode();G->ApplySettings(false);
    DisplayLogAt=FPlatformTime::Seconds()+.5;
    if(auto* V=IConsoleManager::Get().FindConsoleVariable(TEXT("r.MotionBlurQuality")))V->Set(0,ECVF_SetByGameSetting);
    if(Ambience)Ambience->SetVolumeMultiplier(Save->Volume);
}
FString AWalkController::DisplayStatus() const {
    const FIntPoint Actual=ViewportResolution(),Native=UGameUserSettings::GetGameUserSettings()->GetDesktopResolution();
    return FString::Printf(TEXT("Select a setting to cycle its choices.\nBorderless uses the monitor's %d × %d desktop.\nCurrent view: %d × %d · render scale %.0f%% · 60 fps cap"),Native.X,Native.Y,Actual.X,Actual.Y,AppliedRenderScale());
}
TSharedRef<FJsonObject> AWalkController::DisplayReport() const {
    const auto* G=UGameUserSettings::GetGameUserSettings();const FIntPoint Actual=ViewportResolution(),Configured=G->GetScreenResolution(),Native=G->GetDesktopResolution();
    auto Report=MakeShared<FJsonObject>();
    auto Pair=[&](const TCHAR* Key,FIntPoint P){Report->SetArrayField(Key,{MakeShared<FJsonValueNumber>(P.X),MakeShared<FJsonValueNumber>(P.Y)});};
    Pair(TEXT("viewport_resolution"),Actual);Pair(TEXT("configured_resolution"),Configured);Pair(TEXT("native_resolution"),Native);Pair(TEXT("saved_window_resolution"),Save->WindowResolution);
    Report->SetBoolField(TEXT("borderless"),Save->Fullscreen);Report->SetNumberField(TEXT("window_mode"),G->GetFullscreenMode());
    Report->SetNumberField(TEXT("monitor_index"),G->GetClosestMonitorIndex());Report->SetStringField(TEXT("monitor_id"),G->GetDisplayID());
    Report->SetNumberField(TEXT("requested_render_scale"),Save->RenderScale);Report->SetNumberField(TEXT("applied_render_scale"),AppliedRenderScale());Report->SetNumberField(TEXT("screen_percentage_cvar"),ScreenPercentage());
    Report->SetNumberField(TEXT("quality"),Save->Quality);Report->SetNumberField(TEXT("frame_rate_cap"),G->GetFrameRateLimit());Report->SetBoolField(TEXT("vsync"),G->IsVSyncEnabled());Report->SetBoolField(TEXT("dynamic_resolution"),G->IsDynamicResolutionEnabled());
    const auto Dpi=NativeDpiAwareness();
    Report->SetBoolField(TEXT("configured_high_dpi_enabled"),ConfiguredHighDpiEnabled());Report->SetBoolField(TEXT("high_dpi_enabled"),Dpi.PerMonitor());
    Report->SetNumberField(TEXT("windows_process_dpi_awareness"),Dpi.Process);Report->SetNumberField(TEXT("windows_thread_dpi_awareness"),Dpi.Thread);Report->SetNumberField(TEXT("windows_window_dpi_awareness"),Dpi.Window);
    Report->SetNumberField(TEXT("native_window_dpi"),Dpi.WindowDpi);Report->SetNumberField(TEXT("window_dpi_scale"),WindowDpiScale());
    Report->SetNumberField(TEXT("application_scale"),FSlateApplication::IsInitialized()?FSlateApplication::Get().GetApplicationScale():0.f);
    return Report;
}
void AWalkController::Observe() {
    if(Aligning||!Walking||!Page.IsEmpty()||!Places.IsValidIndex(Nearby))return;
    const auto& P=Places[Nearby];Save->Visited.AddUnique(P.Id);Persist(true);
    if(Save->Visited.Num()==Places.Num())Notify(TEXT("A full circle. Every place noticed; stay as long as you like."));
    Show(FString::Printf(TEXT("place:%d"),Nearby));
}
void AWalkController::Action(const FString& Id) {
    if(Id=="continue"&&Save->HasWalk)StartWalk(true);
    else if(Id=="new") {if(Save->HasWalk)Show("new-confirm");else StartWalk(false);}
    else if(Id=="new-confirmed"&&Page=="new-confirm")StartWalk(false);
    else if(Id=="resume"&&Walking)Show("");
    else if(Id=="tour"&&TourPosition.Num()>1){if(Walking)StartTour();else Show("");}
    else if(Id=="back")Back();
    else if(Id=="settings"||Id=="controls"||Id=="journal"||Id.StartsWith("place:"))Show(Id);
    else if(Id=="title"){StopAlign();if(Persist(true)){Walking=false;Travel(0);Show("home");}}
    else if(Id=="quit"){if(Persist(Walking))UKismetSystemLibrary::QuitGame(this,this,EQuitPreference::Quit,false);}
    else if(Id=="rescue"&&Walking){if(Travel(0)){Show("");Persist(true);Notify(TEXT("Back at the house entrance."));}else Notify(TEXT("Could not find safe ground at the entrance."));}
    else if(Id.StartsWith("travel:")&&Walking){int32 I=FCString::Atoi(*Id.Mid(7));if(Places.IsValidIndex(I)&&Save->Visited.Contains(Places[I].Id)){if(Travel(I)){Show("");Persist(true);}else Notify(TEXT("This landing is blocked. Your position is unchanged."));}}
    else if(Id=="photos"&&!PhotoDir.IsEmpty()){
        if(!Page.StartsWith("photo")&&Page!="note"){
            PhotoFiles.Reset();TArray<FString> Found;
            for(const TCHAR* Ext:{TEXT("*.jpg"),TEXT("*.jpeg"),TEXT("*.png")}){Found.Reset();IFileManager::Get().FindFiles(Found,*(PhotoDir/Ext),true,false);PhotoFiles.Append(Found);}
            PhotoFiles.Sort();
        }
        PhotoPage=FMath::Clamp(PhotoPage,0,FMath::Max(0,(PhotoFiles.Num()-1)/PhotosPerPage));Show("photos");
    }
    else if(Id=="photos-next"&&Page=="photos"){PhotoPage++;Action("photos");}
    else if(Id=="photos-prev"&&Page=="photos"){PhotoPage=FMath::Max(0,PhotoPage-1);Action("photos");}
    else if(Id.StartsWith("photo:")){if(OpenPhoto(FCString::Atoi(*Id.Mid(6))))Show(FString::Printf(TEXT("photo:%d"),PhotoIndex));else Notify(TEXT("Could not read that photograph."));}
    else if((Id=="align-saved"||Id=="align-here")&&Page.StartsWith("photo:"))StartAlign(Id=="align-saved");
    else if(Id=="note"&&Page.StartsWith("photo:")){LoadPoses();NoteDraft=PhotoNote(PhotoName());Show("note");}
    else if(Id=="note-save"&&Page=="note"){
        LoadPoses();
        const FString File=PhotoName();const bool Ok=PoseFor(File).IsValid()?SavePose(File,false,&NoteDraft):SaveLooseNote(NoteDraft,File);
        Notify(Ok?TEXT("Note saved."):TEXT("Could not save the note."));Show(FString::Printf(TEXT("photo:%d"),PhotoIndex));
    }
    else if(Id=="walknote"){NoteDraft.Empty();Show("walknote");}
    else if(Id=="walknote-save"&&Page=="walknote"){
        const bool Ok=!NoteDraft.TrimStartAndEnd().IsEmpty()&&SaveLooseNote(NoteDraft,FString());
        Notify(Ok?TEXT("Note saved with this spot."):TEXT("Nothing saved."));Show(Walking?"pause":"home");
    }
    else if(Page=="settings") {
        if(Id=="sensitivity") Save->Sensitivity=Save->Sensitivity>=2?.5f:Save->Sensitivity+.25f;
        else if(Id=="fov") Save->Fov=Save->Fov>=100?70:Save->Fov+5;
        else if(Id=="volume") Save->Volume=Save->Volume>=.99f?0:FMath::Min(1.f,Save->Volume+.25f);
        else if(Id=="invert") Save->InvertY=!Save->InvertY;
        else if(Id=="guidance") Save->Guidance=!Save->Guidance;
        else if(Id=="quality") Save->Quality=(Save->Quality+1)%4;
        else if(Id=="display") Save->Fullscreen=!Save->Fullscreen;
        else if(Id=="resolution") {const auto Choices=WindowChoices();int32 Next=0;for(int32 I=0;I<Choices.Num();I++)if(Choices[I].X>Save->WindowResolution.X){Next=I;break;}Save->WindowResolution=Choices[Next];}
        else if(Id=="render-scale") Save->RenderScale=Save->RenderScale<67?67:Save->RenderScale<83?83:Save->RenderScale<100?100:67;
        else if(Id=="defaults"){Save->Sensitivity=1;Save->Fov=85;Save->Volume=.5;Save->InvertY=false;Save->Guidance=true;Save->Quality=2;Save->Fullscreen=false;Save->WindowResolution=FitWindow(FIntPoint(1600,900));Save->RenderScale=100;}
        else return;
        ApplySettings();Persist(false);Show("settings");
    }
}
void AWalkController::WalkAction(const FString& Id){Action(Id);}
FString AWalkController::Status() const {
    if(!Page.IsEmpty()||!Walking)return TEXT("");
    if(!Save->Guidance)return TEXT("");
    FString S=FString::Printf(TEXT("A quiet walk  ·  %d / %d places\nJ / Y  Journal     Esc / Menu  Pause"),Save->Visited.Num(),Places.Num());
    if(APawn* P=GetPawn()) {float Best=1e20f;const FWalkPlace* Next=nullptr;for(const auto& Place:Places) if(!Save->Visited.Contains(Place.Id)){float D=FVector::DistSquared2D(P->GetActorLocation(),Place.Feet);if(D<Best){Best=D;Next=&Place;}} if(Next) {float Angle=FMath::FindDeltaAngleDegrees(GetControlRotation().Yaw,(Next->Feet-P->GetActorLocation()).Rotation().Yaw);S+=FString::Printf(TEXT("\n%s · %.0f m · %s"),*Next->Title,FMath::Sqrt(Best)/100,FMath::Abs(Angle)<30?TEXT("ahead"):FMath::Abs(Angle)>145?TEXT("behind you"):Angle>0?TEXT("to your right"):TEXT("to your left"));}}
    return S;
}
FString AWalkController::Prompt() const {
    if(!Page.IsEmpty())return TEXT("");
    if(Aligning){
        return (FPlatformTime::Seconds()<ToastUntil?Toast+TEXT("\n"):FString())+FString::Printf(TEXT("%s   ·   %d / %d   ·   %s   ·   lens %.1f°\nLB RB / [ ]  Photo      Y / G  Saved position      A / Enter  Save      X / Tab  Photo size      B / Esc  Photo menu\nSticks / WASD, mouse  Move, look      LT RT / Q E  Down, up      L3 / Shift  Faster      D-pad ↑ ↓ / − =  Lens      D-pad ← → / Z C  Tilt"),
            *FPaths::GetBaseFilename(PhotoName()),PhotoIndex+1,PhotoFiles.Num(),PoseFor(PhotoName()).IsValid()?TEXT("saved alignment"):TEXT("no saved alignment"),AlignVFov);
    }
    if(!Walking){
        if(TourPosition.Num()<2||!Save->Guidance)return TEXT("");
        FString L=TourLabel();
        if(FPlatformTime::Seconds()<TourShownAt+12)L+=TEXT("\nWASD / sticks  Walk from here      Esc / Menu  Menu");
        return L;
    }
    if(FPlatformTime::Seconds()<ToastUntil)return Toast;
    if(Places.IsValidIndex(Nearby)) return TEXT("E / A  ·  ")+Places[Nearby].Title;
    return TEXT("");
}
void AWalkController::PlayerTick(float D) {
    Super::PlayerTick(D);
    if(WaterProbe&&WaterProbeFinished)return;
    if(!InitialViewReady&&GetPawn()){InitialViewReady=Travel(0);ApplySettings();}
    if(DisplayLogAt>0&&FPlatformTime::Seconds()>=DisplayLogAt) {
        const FIntPoint Actual=ViewportResolution();const auto Dpi=NativeDpiAwareness();
        UE_LOG(LogTemp,Display,TEXT("QUIETWALK display actual: %dx%d, borderless %d, render scale %.1f%%, screen percentage %.1f%%, configured DPI %d, Windows awareness process/thread/window %d/%d/%d, native DPI %u, window DPI scale %.2f, cap 60, VSync 1"),Actual.X,Actual.Y,Save->Fullscreen,AppliedRenderScale(),ScreenPercentage(),ConfiguredHighDpiEnabled(),Dpi.Process,Dpi.Thread,Dpi.Window,Dpi.WindowDpi,WindowDpiScale());
        DisplayLogAt=0;
    }
    if(Menu&&FocusAt>0&&FPlatformTime::Seconds()>=FocusAt){Menu->Focus(PendingFocus);FocusAt=0;}
    if(Smoke)SmokeTick();
    if(WaterProbe)WaterProbeTick();
    if(!ReviewPhoto.IsEmpty())ReviewTick();
    if(Aligning){if(Page.IsEmpty())TickAlign(D);return;}
    if(!Walking){if(Page.IsEmpty())TickTour(D);return;}
    if(!Page.IsEmpty())return;
    if(!Smoke&&!WaterProbe&&!FSlateApplication::Get().IsActive()){Show("pause");return;}
    auto* C=Cast<AWalkCharacter>(GetPawn());if(!C)return;
    if(Smoke&&SmokeMoving&&SmokeTempleStairStep>=3&&SmokeTempleStairStep<=6) {
        // Short portico routes stop at their authored endpoints, before the
        // hanging bell/columns. Movement still crosses every physical tread.
        const bool Up=(SmokeTempleStairStep-3)%2==0;const float Y=C->GetActorLocation().Y;
        if((Up&&Y<=1328)||(!Up&&Y>=1440)){SmokeMoving=false;C->GetCharacterMovement()->StopMovementImmediately();}
    }
    if(Smoke&&SmokeMoving)C->Forward(1);
    if(WaterProbe&&WaterProbeMoving)C->Forward(1);
    Nearby=INDEX_NONE;float Best=280*280;
    for(int32 I=0;I<Places.Num();I++){FVector Delta=Places[I].Feet+FVector(0,0,88)-C->GetActorLocation();if(FMath::Abs(Delta.Z)<120&&Delta.SizeSquared2D()<Best){FHitResult Hit;FCollisionQueryParams P;P.AddIgnoredActor(C);if(!GetWorld()->LineTraceSingleByChannel(Hit,C->Camera->GetComponentLocation(),Places[I].Feet+FVector(0,0,150),ECC_Visibility,P)){Nearby=I;Best=Delta.SizeSquared2D();}}}
    if(C->GetActorLocation().Z<-850||C->GetActorLocation().Size2D()>16000){
        if(WaterProbe)WaterProbeSample(TEXT("automatic_rescue_before"));
        Travel(0);Notify(TEXT("Back on the path. Your journal is safe."));
        if(WaterProbe)WaterProbeSample(TEXT("automatic_rescue_after"));
    }
    SaveTimer+=D;if(SaveTimer>20){Persist(true);SaveTimer=0;}
    if(C->GetCharacterMovement()->IsMovingOnGround()&&C->GetVelocity().Size2D()>40){FootstepTimer+=D;if(FootstepTimer> (C->GetVelocity().Size2D()>210?.43f:.65f)){FootstepTimer=0; if(auto* Sound=LoadObject<USoundWave>(nullptr,TEXT("/Game/WalkAudio/Footstep.Footstep")))UGameplayStatics::PlaySound2D(this,Sound,Save->Volume*.3f,FMath::FRandRange(.92f,1.08f));}}else FootstepTimer=.3f;
}


// ---- Photo alignment and notes -------------------------------------------------------------
namespace {
// three.js metres, y up  <->  Unreal centimetres, z up (as in LoadTour and capture_poses.py).
FVector Swap3(const FVector& V){return FVector(V.X,V.Z,V.Y);}
FString NowIso(){return FDateTime::UtcNow().ToString(TEXT("%Y-%m-%dT%H:%M:%S.000Z"));}
TArray<TSharedPtr<FJsonValue>> Numbers(const TArray<double>& V){TArray<TSharedPtr<FJsonValue>> A;for(double N:V)A.Add(MakeShared<FJsonValueNumber>(N));return A;}
bool WriteJson(const TSharedRef<FJsonObject>& Root,const FString& Path){
    FString Out;auto Writer=TJsonWriterFactory<>::Create(&Out);
    if(!FJsonSerializer::Serialize(Root,Writer))return false;
    // Write beside the target, then swap, so a failed write never truncates the poses.
    const FString Temp=Path+TEXT(".tmp");
    return FFileHelper::SaveStringToFile(Out,*Temp,FFileHelper::EEncodingOptions::ForceUTF8WithoutBOM)&&IFileManager::Get().Move(*Path,*Temp,true,true);
}
TSharedPtr<FJsonObject> ReadJson(const FString& Path){
    FString Text;TSharedPtr<FJsonObject> J;
    if(!FFileHelper::LoadFileToString(Text,*Path)||!FJsonSerializer::Deserialize(TJsonReaderFactory<>::Create(Text),J))return nullptr;
    return J;
}
FString LatestPhotoNote(const TSharedPtr<FJsonObject>& Root,const FString& File){
    const TArray<TSharedPtr<FJsonValue>>* Notes=nullptr;
    if(File.IsEmpty()||!Root.IsValid()||!Root->TryGetArrayField(TEXT("notes"),Notes))return FString();
    // Loose notes are append-only history; an empty latest entry also means the note was cleared.
    for(int32 I=Notes->Num()-1;I>=0;--I){const TSharedPtr<FJsonObject>* N=nullptr;FString Photo,Text;
        if((*Notes)[I]->TryGetObject(N)&&(*N)->TryGetStringField(TEXT("photo"),Photo)&&Photo==File&&(*N)->TryGetStringField(TEXT("text"),Text))return Text;}
    return FString();
}
}
FString AWalkController::NotesPath() const {
    return (PhotoDir.IsEmpty()?FPaths::ConvertRelativePathToFull(FPaths::ProjectSavedDir()):PhotoDir)/TEXT("unreal-notes.json");
}
bool AWalkController::LoadPoses() {
    PoseRoot=PhotoDir.IsEmpty()?nullptr:ReadJson(PhotoDir/TEXT("align-poses.json"));
    NotesRoot=ReadJson(NotesPath());
    return PoseRoot.IsValid();
}
TSharedPtr<FJsonObject> AWalkController::PoseFor(const FString& File) const {
    const TArray<TSharedPtr<FJsonValue>>* Poses=nullptr;
    if(!PoseRoot.IsValid()||!PoseRoot->TryGetArrayField(TEXT("poses"),Poses))return nullptr;
    for(const auto& V:*Poses){const TSharedPtr<FJsonObject>* R=nullptr;FString Name;if(V->TryGetObject(R)&&(*R)->TryGetStringField(TEXT("filename"),Name)&&Name==File&&(*R)->HasField(TEXT("camera")))return *R;}
    return nullptr;
}
FString AWalkController::PhotoNote(const FString& File) const {
    FString Note;const auto R=PoseFor(File);
    if(R.IsValid()&&R->TryGetStringField(TEXT("notes"),Note))return Note;
    return LatestPhotoNote(NotesRoot,File);
}
void AWalkController::ThreeCamera(TArray<double>& Position,TArray<double>& Quaternion,TArray<double>& Direction) const {
    const bool Free=Aligning&&AlignCamera;
    const FVector Eye=Free?AlignCamera->GetActorLocation():(PlayerCameraManager?PlayerCameraManager->GetCameraLocation():FVector::ZeroVector);
    const FQuat Q=Free?AlignCamera->GetActorQuat():(PlayerCameraManager?PlayerCameraManager->GetCameraRotation().Quaternion():FQuat::Identity);
    const FVector P=Swap3(Eye)/100;
    // A three.js camera looks along -z with +y up: the columns of its rotation are right, up, -forward.
    const FVector F=Swap3(Q.GetForwardVector()),U=Swap3(Q.GetUpVector()),R=FVector::CrossProduct(F,U),B=-F;
    const double M00=R.X,M10=R.Y,M20=R.Z,M01=U.X,M11=U.Y,M21=U.Z,M02=B.X,M12=B.Y,M22=B.Z,Trace=M00+M11+M22;
    double X,Y,Z,W;
    if(Trace>0){const double S=.5/FMath::Sqrt(Trace+1);W=.25/S;X=(M21-M12)*S;Y=(M02-M20)*S;Z=(M10-M01)*S;}
    else if(M00>M11&&M00>M22){const double S=2*FMath::Sqrt(1+M00-M11-M22);W=(M21-M12)/S;X=.25*S;Y=(M01+M10)/S;Z=(M02+M20)/S;}
    else if(M11>M22){const double S=2*FMath::Sqrt(1+M11-M00-M22);W=(M02-M20)/S;X=(M01+M10)/S;Y=.25*S;Z=(M12+M21)/S;}
    else{const double S=2*FMath::Sqrt(1+M22-M00-M11);W=(M10-M01)/S;X=(M02+M20)/S;Y=(M12+M21)/S;Z=.25*S;}
    const double N=FMath::Sqrt(X*X+Y*Y+Z*Z+W*W);
    Position={P.X,P.Y,P.Z};Quaternion={X/N,Y/N,Z/N,W/N};Direction={F.X,F.Y,F.Z};
}
bool AWalkController::SavePose(const FString& File,bool Camera,const FString* Notes) {
    if(PhotoDir.IsEmpty()||File.IsEmpty())return false;
    const FString Path=PhotoDir/TEXT("align-poses.json");
    // Re-read first: the web align tool may have saved other photographs meanwhile.
    TSharedPtr<FJsonObject> Root=ReadJson(Path);
    if(!Root.IsValid()){
        if(IFileManager::Get().FileExists(*Path))return false;  // unreadable: never overwrite it
        Root=MakeShared<FJsonObject>();Root->SetStringField(TEXT("schema"),TEXT("shankaranarayana-photo-poses"));Root->SetNumberField(TEXT("version"),1);
        Root->SetStringField(TEXT("coordinates"),TEXT("Three.js world metres; Y up; camera position is eye position (not feet)"));
    }
    TArray<TSharedPtr<FJsonValue>> Poses;const TArray<TSharedPtr<FJsonValue>>* Old=nullptr;
    if(Root->TryGetArrayField(TEXT("poses"),Old))Poses=*Old;else if(Root->HasField(TEXT("poses")))return false;
    TSharedPtr<FJsonObject> Record;
    for(const auto& V:Poses){const TSharedPtr<FJsonObject>* R=nullptr;FString Name;if(V->TryGetObject(R)&&(*R)->TryGetStringField(TEXT("filename"),Name)&&Name==File){Record=*R;break;}}
    // First alignment carries its loose note into the shared pose; keep the original history.
    const bool FirstAlignment=!Record.IsValid()||!Record->HasField(TEXT("camera"));
    FString InitialNote;
    if(Camera&&FirstAlignment&&!Notes){
        if(Record.IsValid())Record->TryGetStringField(TEXT("notes"),InitialNote);
        if(InitialNote.IsEmpty()){
            const FString LoosePath=NotesPath();const auto Loose=ReadJson(LoosePath);const TArray<TSharedPtr<FJsonValue>>* History=nullptr;
            if((!Loose.IsValid()&&IFileManager::Get().FileExists(*LoosePath))||(Loose.IsValid()&&Loose->HasField(TEXT("notes"))&&!Loose->TryGetArrayField(TEXT("notes"),History)))return false;
            InitialNote=LatestPhotoNote(Loose,File);
        }
    }
    if(!Record.IsValid()){
        if(!Camera)return false;  // a pose record needs a camera; loose notes go to unreal-notes.json
        Record=MakeShared<FJsonObject>();Record->SetStringField(TEXT("id"),TEXT("file:")+File);Record->SetStringField(TEXT("filename"),File);
        Record->SetField(TEXT("sha256"),MakeShared<FJsonValueNull>());Record->SetStringField(TEXT("notes"),TEXT(""));
        Poses.Add(MakeShared<FJsonValueObject>(Record));
    }
    if(Camera&&FirstAlignment&&!Notes)Record->SetStringField(TEXT("notes"),InitialNote);
    if(Camera){
        TArray<double> P,Q,D;ThreeCamera(P,Q,D);
        auto Cam=MakeShared<FJsonObject>();Cam->SetArrayField(TEXT("position"),Numbers(P));Cam->SetArrayField(TEXT("quaternion"),Numbers(Q));Cam->SetArrayField(TEXT("direction"),Numbers(D));
        Cam->SetNumberField(TEXT("verticalFov"),AlignVFov);Cam->SetNumberField(TEXT("aspect"),AlignAspect);Record->SetObjectField(TEXT("camera"),Cam);
        auto Image=MakeShared<FJsonObject>();Image->SetNumberField(TEXT("width"),PhotoTexture?PhotoTexture->GetSizeX():0);Image->SetNumberField(TEXT("height"),PhotoTexture?PhotoTexture->GetSizeY():0);Image->SetStringField(TEXT("fit"),TEXT("exact"));
        Record->SetObjectField(TEXT("image"),Image);
        FVector2D Size(1600,900);if(GEngine&&GEngine->GameViewport)GEngine->GameViewport->GetViewportSize(Size);
        auto View=MakeShared<FJsonObject>();View->SetNumberField(TEXT("width"),Size.X);View->SetNumberField(TEXT("height"),Size.Y);Record->SetObjectField(TEXT("viewport"),View);
        Record->SetStringField(TEXT("tool"),TEXT("unreal"));
    }
    if(Notes)Record->SetStringField(TEXT("notes"),*Notes);
    // The web tool keeps its own copy unless the file's is at least as new.
    Record->SetStringField(TEXT("savedAt"),NowIso());Root->SetStringField(TEXT("exportedAt"),NowIso());
    Root->SetArrayField(TEXT("poses"),Poses);
    if(!WriteJson(Root.ToSharedRef(),Path))return false;
    PoseRoot=Root;return true;
}
bool AWalkController::SaveLooseNote(const FString& Text,const FString& Photo) {
    // Notes that have no pose to hang on: a spot in the walk, or a photograph not aligned yet.
    const FString Path=NotesPath();
    TSharedPtr<FJsonObject> Root=ReadJson(Path);
    if(!Root.IsValid()){
        if(IFileManager::Get().FileExists(*Path))return false;
        Root=MakeShared<FJsonObject>();Root->SetStringField(TEXT("schema"),TEXT("shankaranarayana-unreal-notes"));Root->SetNumberField(TEXT("version"),1);
        Root->SetStringField(TEXT("coordinates"),TEXT("Three.js world metres; Y up; position is the eye"));
    }
    TArray<TSharedPtr<FJsonValue>> Notes;const TArray<TSharedPtr<FJsonValue>>* Old=nullptr;
    if(Root->TryGetArrayField(TEXT("notes"),Old))Notes=*Old;else if(Root->HasField(TEXT("notes")))return false;
    TArray<double> P,Q,D;ThreeCamera(P,Q,D);
    auto Note=MakeShared<FJsonObject>();Note->SetStringField(TEXT("savedAt"),NowIso());Note->SetStringField(TEXT("text"),Text);
    if(!Photo.IsEmpty())Note->SetStringField(TEXT("photo"),Photo);
    Note->SetArrayField(TEXT("position"),Numbers(P));Note->SetArrayField(TEXT("quaternion"),Numbers(Q));Note->SetArrayField(TEXT("direction"),Numbers(D));
    Note->SetStringField(TEXT("mode"),Aligning?TEXT("aligning"):Walking?TEXT("walking"):TEXT("tour"));
    if(!Walking&&!Aligning)Note->SetStringField(TEXT("tourLabel"),TourLabel());
    Notes.Add(MakeShared<FJsonValueObject>(Note));Root->SetArrayField(TEXT("notes"),Notes);
    if(!WriteJson(Root.ToSharedRef(),Path))return false;
    NotesRoot=Root;return true;
}
bool AWalkController::OpenPhoto(int32 Index) {
    if(!PhotoFiles.IsValidIndex(Index))return false;
    UTexture2D* T=FImageUtils::ImportFileAsTexture2D(PhotoDir/PhotoFiles[Index]);
    if(!T||T->GetSizeX()<2||T->GetSizeY()<2)return false;
    PhotoIndex=Index;PhotoTexture=T;AlignAspect=float(T->GetSizeX())/T->GetSizeY();
    PhotoBrush->SetResourceObject(T);PhotoBrush->ImageSize=FVector2D(T->GetSizeX(),T->GetSizeY());PhotoBrush->DrawAs=ESlateBrushDrawType::Image;
    LoadPoses();
    return true;
}
void AWalkController::ApplyAlignLens() {
    if(!AlignCamera)return;
    AlignVFov=FMath::Clamp(AlignVFov,20.f,110.f);
    auto* C=AlignCamera->GetCameraComponent();
    // Frame exactly what the photograph frames: its aspect, and the saved vertical field of view.
    C->SetConstraintAspectRatio(true);C->SetAspectRatio(AlignAspect);
    C->SetFieldOfView(FMath::RadiansToDegrees(2*FMath::Atan(FMath::Tan(FMath::DegreesToRadians(AlignVFov)/2)*AlignAspect)));
}
bool AWalkController::SavedView(bool Move,FVector& P,FQuat& Q) {
    LoadPoses();
    const TSharedPtr<FJsonObject> R=PoseFor(PhotoName());const TSharedPtr<FJsonObject>* Cam=nullptr;
    if(!R.IsValid()||!R->TryGetObjectField(TEXT("camera"),Cam))return false;
    double V=AlignVFov;if((*Cam)->TryGetNumberField(TEXT("verticalFov"),V))AlignVFov=V;
    // Legacy cover-fitted poses: widen the lens as capture_poses.py does.
    const TSharedPtr<FJsonObject>* Image=nullptr;const TSharedPtr<FJsonObject>* View=nullptr;FString Fit;
    if(Move&&R->TryGetObjectField(TEXT("image"),Image)&&(*Image)->TryGetStringField(TEXT("fit"),Fit)&&Fit==TEXT("cover")&&R->TryGetObjectField(TEXT("viewport"),View)){
        const double Ratio=(*View)->GetNumberField(TEXT("width"))/FMath::Max(1.0,(*View)->GetNumberField(TEXT("height")));
        if(Ratio>AlignAspect)AlignVFov=FMath::RadiansToDegrees(2*FMath::Atan(FMath::Tan(FMath::DegreesToRadians(AlignVFov)/2)*Ratio/AlignAspect));
    }
    const TArray<TSharedPtr<FJsonValue>>* A=nullptr;const TArray<TSharedPtr<FJsonValue>>* B=nullptr;
    if(!Move||!(*Cam)->TryGetArrayField(TEXT("position"),A)||A->Num()!=3||!(*Cam)->TryGetArrayField(TEXT("quaternion"),B)||B->Num()!=4)return false;
    P=Swap3(FVector((*A)[0]->AsNumber(),(*A)[1]->AsNumber(),(*A)[2]->AsNumber()))*100;
    const FQuat Q3((*B)[0]->AsNumber(),(*B)[1]->AsNumber(),(*B)[2]->AsNumber(),(*B)[3]->AsNumber());
    Q=FRotationMatrix::MakeFromXZ(Swap3(Q3.RotateVector(FVector(0,0,-1))),Swap3(Q3.RotateVector(FVector(0,1,0)))).ToQuat();
    return true;
}
void AWalkController::StartAlign(bool FromSaved) {
    if(!PhotoTexture||!PlayerCameraManager)return;
    FVector P=PlayerCameraManager->GetCameraLocation();FQuat Q=PlayerCameraManager->GetCameraRotation().Quaternion();
    if(Aligning&&AlignCamera){P=AlignCamera->GetActorLocation();Q=AlignCamera->GetActorQuat();}
    SavedView(FromSaved,P,Q);
    if(!AlignCamera)AlignCamera=GetWorld()->SpawnActor<ACameraActor>(P,Q.Rotator());
    if(!AlignCamera)return;
    if(Walking)Persist(true);
    AlignCamera->SetActorLocationAndRotation(P,Q);Aligning=true;AlignMove=FVector2D::ZeroVector;ApplyAlignLens();
    Show("");Notify(FromSaved?TEXT("At the saved position. Adjust, then Enter / A to save."):TEXT("Move until the view matches the photograph, then Enter / A to save."));
}
void AWalkController::StopAlign() { Aligning=false;AlignOverlay=false;AlignMove=FVector2D::ZeroVector; }
bool AWalkController::AlignToSaved() {
    FVector P=FVector::ZeroVector;FQuat Q=FQuat::Identity;const bool Ok=AlignCamera&&SavedView(true,P,Q);
    if(Ok)AlignCamera->SetActorLocationAndRotation(P,Q);
    ApplyAlignLens();return Ok;
}
bool AWalkController::AlignStep(int32 Dir) {
    const int32 N=PhotoFiles.Num();
    // Skip pictures that cannot be read; an unaligned photograph keeps the camera where it is.
    for(int32 K=1;Aligning&&AlignCamera&&K<N;K++){
        const int32 I=((PhotoIndex+Dir*K)%N+N)%N;if(!OpenPhoto(I))continue;
        PhotoPage=I/PhotosPerPage;
        Notify(FString::Printf(TEXT("Photo %d / %d  ·  %s"),I+1,N,AlignToSaved()?TEXT("at its saved position."):TEXT("no saved alignment; the camera stays here.")));return true;
    }
    Notify(TEXT("There is no other photograph to open."));return false;
}
void AWalkController::AlignTurn(float Yaw,float Pitch) {
    if(!AlignCamera)return;
    FRotator R=AlignCamera->GetActorRotation();R.Yaw+=Yaw;R.Pitch=FMath::Clamp(R.Pitch+Pitch,-89.f,89.f);AlignCamera->SetActorRotation(R);
}
void AWalkController::TickAlign(float Delta) {
    if(!AlignCamera)return;
    const float D=FMath::Min(Delta,.1f);
    auto Held=[this](const FKey& A,const FKey& B){return IsInputKeyDown(A)||IsInputKeyDown(B)?1.f:0.f;};
    auto Hit=[this](const FKey& A,const FKey& B){return WasInputKeyJustPressed(A)||WasInputKeyJustPressed(B);};
    // Triggers lower and raise in proportion to their pull; the bumpers change the photograph.
    auto Pull=[this](const FKey& Axis){const float V=GetInputAnalogKeyState(Axis);return V>.1f?V:0.f;};
    const bool Fast=IsInputKeyDown(EKeys::LeftShift)||IsInputKeyDown(EKeys::Gamepad_LeftThumbstick);
    const float Rise=FMath::Max(IsInputKeyDown(EKeys::E)?1.f:0.f,Pull(EKeys::Gamepad_RightTriggerAxis))-FMath::Max(IsInputKeyDown(EKeys::Q)?1.f:0.f,Pull(EKeys::Gamepad_LeftTriggerAxis));
    const FRotator R=AlignCamera->GetActorRotation();const FRotationMatrix M(R);
    AlignCamera->AddActorWorldOffset((M.GetUnitAxis(EAxis::X)*AlignMove.X+M.GetUnitAxis(EAxis::Y)*AlignMove.Y+FVector(0,0,Rise))*(Fast?450.f:110.f)*D);
    const float Lens=Held(EKeys::Equals,EKeys::Gamepad_DPad_Up)-Held(EKeys::Hyphen,EKeys::Gamepad_DPad_Down);
    if(Lens!=0){AlignVFov+=Lens*8*D;ApplyAlignLens();}
    const float Tilt=Held(EKeys::C,EKeys::Gamepad_DPad_Right)-Held(EKeys::Z,EKeys::Gamepad_DPad_Left);
    if(Tilt!=0){FRotator T=R;T.Roll=FMath::Clamp(T.Roll+Tilt*12*D,-30.f,30.f);AlignCamera->SetActorRotation(T);}
    if(Hit(EKeys::Tab,EKeys::Gamepad_FaceButton_Left))AlignOverlay=!AlignOverlay;
    if(Hit(EKeys::Enter,EKeys::Gamepad_FaceButton_Bottom))
        Notify(SavePose(PhotoName(),true,nullptr)?TEXT("Alignment saved."):TEXT("Could not save the alignment. Check the photo folder's pose and note files."));
    if(Hit(EKeys::G,EKeys::Gamepad_FaceButton_Top))Notify(AlignToSaved()?TEXT("At the saved position."):TEXT("No saved alignment for this photograph yet."));
    const int32 Step=(Hit(EKeys::PageDown,EKeys::RightBracket)||WasInputKeyJustPressed(EKeys::Gamepad_RightShoulder)?1:0)-(Hit(EKeys::PageUp,EKeys::LeftBracket)||WasInputKeyJustPressed(EKeys::Gamepad_LeftShoulder)?1:0);
    if(Step)AlignStep(Step);
    if(WasInputKeyJustPressed(EKeys::Gamepad_FaceButton_Right))PauseWalk();
}

bool AWalkController::LoadTour() {
    FString Text;
    if(!FFileHelper::LoadFileToString(Text,*(FPaths::ProjectContentDir()/TEXT("Tour/tour.json"))))return false;
    TSharedPtr<FJsonObject> J;
    if(!FJsonSerializer::Deserialize(TJsonReaderFactory<>::Create(Text),J)||!J.IsValid())return false;
    const TArray<TSharedPtr<FJsonValue>>* Frames=nullptr;
    if(!J->TryGetArrayField(TEXT("frames"),Frames)||Frames->Num()<8)return false;
    TourFps=J->GetNumberField(TEXT("fps"));TourFov=J->GetNumberField(TEXT("fov"));
    if(TourFps<=0)return false;
    TourPosition.Reset();TourRotation.Reset();TourMarkers.Reset();
    FQuat Prev=FQuat::Identity;
    // three.js frames: eye position in metres (y up) and camera quaternion (looks along -z).
    // Unreal swaps y and z and uses centimetres, as in capture.py.
    auto Swap=[](const FVector& V){return FVector(V.X,V.Z,V.Y);};
    for(const auto& Value:*Frames){
        const auto& A=Value->AsArray();if(A.Num()<7)return false;
        TourPosition.Add(Swap(FVector(A[0]->AsNumber(),A[1]->AsNumber(),A[2]->AsNumber()))*100);
        const FQuat Q3(A[3]->AsNumber(),A[4]->AsNumber(),A[5]->AsNumber(),A[6]->AsNumber());
        FQuat Q=FRotationMatrix::MakeFromXZ(Swap(Q3.RotateVector(FVector(0,0,-1))),Swap(Q3.RotateVector(FVector(0,1,0)))).ToQuat();
        if((Prev|Q)<0)Q=FQuat(-Q.X,-Q.Y,-Q.Z,-Q.W);
        TourRotation.Add(Q);Prev=Q;
    }
    const TArray<TSharedPtr<FJsonValue>>* Markers=nullptr;
    if(J->TryGetArrayField(TEXT("markers"),Markers))for(const auto& M:*Markers){const auto& A=M->AsArray();if(A.Num()==2)TourMarkers.Emplace((int32)A[0]->AsNumber(),A[1]->AsString());}
    // The export is the one-time opening flight, then one loop that ends where it began
    // (plus one sample). Find where the loop starts by matching its last two samples.
    const int32 N=TourPosition.Num();double Best=1e30;TourLoopStart=0;
    for(int32 K=0;K<N/2;K++){double E=FVector::Dist(TourPosition[K],TourPosition[N-2])+FVector::Dist(TourPosition[K+1],TourPosition[N-1]);if(E<Best){Best=E;TourLoopStart=K;}}
    TourPeriod=N-2-TourLoopStart;
    if(Best>50){TourLoopStart=0;TourPeriod=N-1;}
    UE_LOG(LogTemp,Display,TEXT("QUIETWALK tour %d frames, loop %d..%d (match %.1f cm)"),N,TourLoopStart,TourLoopStart+TourPeriod,Best);
    TourTime=0;return true;
}
void AWalkController::TickTour(float Delta) {
    if(TourPosition.Num()<2||!TitleCamera)return;
    TourTime+=FMath::Min(Delta,.25f);
    const int32 End=TourLoopStart+TourPeriod;
    if(TourTime*TourFps>=End)TourTime-=TourPeriod/(double)TourFps;
    const double F=TourTime*TourFps;const int32 I=FMath::FloorToInt(F);const float T=F-I;
    auto At=[&](int32 J){if(J>=End)J-=TourPeriod;return FMath::Clamp(J,0,TourPosition.Num()-1);};
    const FVector P0=TourPosition[At(I-1)],P1=TourPosition[At(I)],P2=TourPosition[At(I+1)],P3=TourPosition[At(I+2)];
    // Uniform Catmull-Rom through the 24 Hz samples, so motion has no per-sample corners.
    const FVector P=.5f*(2*P1+(P2-P0)*T+(2*P0-5*P1+4*P2-P3)*T*T+(3*P1-P0-3*P2+P3)*T*T*T);
    TitleCamera->SetActorLocationAndRotation(P,FQuat::Slerp(TourRotation[At(I)],TourRotation[At(I+1)],T));
    // The tour's field of view is vertical (three.js); Unreal's is horizontal.
    FVector2D Size(16,9);if(GEngine&&GEngine->GameViewport)GEngine->GameViewport->GetViewportSize(Size);
    const float Aspect=Size.Y>0?Size.X/Size.Y:16.f/9;
    TitleCamera->GetCameraComponent()->SetFieldOfView(FMath::RadiansToDegrees(2*FMath::Atan(FMath::Tan(FMath::DegreesToRadians(TourFov)/2)*Aspect)));
}
void AWalkController::StartTour() {
    if(TourPosition.Num()<2)return;
    StopAlign();
    if(Walking)Persist(true);
    Walking=false;TourTime=0;TourShownAt=FPlatformTime::Seconds();TickTour(0);Show("");
}
void AWalkController::TakeOver() {
    if(Walking||!Page.IsEmpty()||TourPosition.Num()<2||!TitleCamera)return;
    // As on the web: leaving during the opening flight walks on from its landing spot on the lane.
    const bool Intro=TourTime*TourFps<TourLoopStart;
    const FVector Landing=TourPosition[TourLoopStart],Eye=Intro?Landing:TitleCamera->GetActorLocation();
    const FRotator Look=TitleCamera->GetActorRotation(),R(FMath::Clamp(FRotator::NormalizeAxis(Look.Pitch),-75.f,75.f),Look.Yaw,0);
    // Tour eyes are 162 cm above the feet; the capsule centre is 90 cm above them.
    if(!RestorePosition(Eye-FVector(0,0,72),R)&&!RestorePosition(Landing-FVector(0,0,72),R))Travel(0);
    if(Smoke)SmokePosition=Eye;
    Walking=true;Save->HasWalk=true;SetViewTarget(GetPawn());ApplySettings();Persist(true);
    Notify(TEXT("Walking from here  ·  Esc / Menu to pause  ·  the tour is in the pause menu"));
}
FString AWalkController::TourLabel() const {
    const int32 F=FMath::FloorToInt(TourTime*TourFps);FString L;
    for(const auto& M:TourMarkers){if(M.Key>F)break;L=M.Value;}
    FString Left;if(L.Split(TEXT(" · "),&Left,nullptr))L=Left;  // drop photo timestamps
    return L;
}

void AWalkController::WaterProbeSample(const FString& Phase) {
    auto* C=Cast<AWalkCharacter>(GetPawn());if(!C||!WaterProbeRoute)return;
    const FVector Position=C->GetActorLocation(),Feet=Position-FVector(0,0,C->GetCapsuleComponent()->GetScaledCapsuleHalfHeight()),Velocity=C->GetVelocity();
    auto Sample=MakeShared<FJsonObject>();
    auto Vec=[&](const TCHAR* Key,const FVector& V){Sample->SetArrayField(Key,{MakeShared<FJsonValueNumber>(V.X),MakeShared<FJsonValueNumber>(V.Y),MakeShared<FJsonValueNumber>(V.Z)});};
    Sample->SetStringField(TEXT("phase"),Phase);Vec(TEXT("position_cm"),Position);Vec(TEXT("feet_cm"),Feet);Vec(TEXT("velocity_cm_s"),Velocity);
    Sample->SetNumberField(TEXT("world_seconds"),GetWorld()->GetTimeSeconds());Sample->SetNumberField(TEXT("simulated_since_start_s"),GetWorld()->GetTimeSeconds()-WaterProbeStart);
    Sample->SetNumberField(TEXT("wall_since_boot_s"),FPlatformTime::Seconds()-BeginTime);
    Sample->SetNumberField(TEXT("movement_mode"),C->GetCharacterMovement()->MovementMode);
    Sample->SetBoolField(TEXT("moving_on_ground"),C->GetCharacterMovement()->IsMovingOnGround());Sample->SetBoolField(TEXT("commanded_forward"),WaterProbeMoving);
    Sample->SetBoolField(TEXT("walking"),Walking);Sample->SetBoolField(TEXT("paused"),IsPaused());
    const auto Box=WaterProbeRoute->GetObjectField(TEXT("authored_water_box_cm"));
    Sample->SetBoolField(TEXT("inside_box_horizontal_bounds"),Feet.X>Box->GetNumberField(TEXT("min_x"))&&Feet.X<Box->GetNumberField(TEXT("max_x"))&&Feet.Y>Box->GetNumberField(TEXT("min_y"))&&Feet.Y<Box->GetNumberField(TEXT("max_y")));
    Sample->SetBoolField(TEXT("feet_below_box_top"),Feet.Z<Box->GetNumberField(TEXT("top_z")));
    auto Samples=WaterProbeRoute->GetArrayField(TEXT("samples"));Samples.Add(MakeShared<FJsonValueObject>(Sample));WaterProbeRoute->SetArrayField(TEXT("samples"),Samples);
    UE_LOG(LogTemp,Display,TEXT("WATERPROBE %s %s sim %.2f position %s feet %.2f ground %d mode %d"),*WaterProbeRoute->GetStringField(TEXT("name")),*Phase,GetWorld()->GetTimeSeconds()-WaterProbeStart,*Position.ToString(),Feet.Z,C->GetCharacterMovement()->IsMovingOnGround(),(int32)C->GetCharacterMovement()->MovementMode);
}
void AWalkController::FinishWaterProbe(const FString& Error) {
    if(WaterProbeFinished)return;
    WaterProbeFinished=true;WaterProbeMoving=false;
    if(auto* C=Cast<AWalkCharacter>(GetPawn()))C->GetCharacterMovement()->StopMovementImmediately();
    if(!WaterProbeReport)WaterProbeReport=MakeShared<FJsonObject>();
    WaterProbeReport->SetBoolField(TEXT("completed"),Error.IsEmpty());WaterProbeReport->SetStringField(TEXT("error"),Error);
    WaterProbeReport->SetNumberField(TEXT("wall_elapsed_s"),FPlatformTime::Seconds()-BeginTime);
    WaterProbeReport->SetObjectField(TEXT("display"),DisplayReport());
    const FString Dir=FPaths::ProjectSavedDir()/TEXT("WalkReview");IFileManager::Get().MakeDirectory(*Dir,true);
    FString Json;auto Writer=TJsonWriterFactory<>::Create(&Json);FJsonSerializer::Serialize(WaterProbeReport.ToSharedRef(),Writer);
    const FString Path=Dir/TEXT("water-probe.json");const bool Written=FFileHelper::SaveStringToFile(Json,*Path);
    UE_LOG(LogTemp,Display,TEXT("WATERPROBE done completed %d report_written %d path %s error %s"),Error.IsEmpty(),Written,*Path,*Error);
    UKismetSystemLibrary::QuitGame(this,this,EQuitPreference::Quit,false);
}
void AWalkController::WaterProbeTick() {
    if(WaterProbeFinished)return;
    const double Now=FPlatformTime::Seconds(),Sim=GetWorld()->GetTimeSeconds();
    if(!WaterProbeReport){
        WaterProbeReport=MakeShared<FJsonObject>();WaterProbeReport->SetStringField(TEXT("schema"),TEXT("quietwalk-water-probe-v1"));
        WaterProbeReport->SetStringField(TEXT("purpose"),TEXT("Characterize current walking collision; no water fix or expected-outcome assertion."));
        WaterProbeReport->SetBoolField(TEXT("walk_save_writes_disabled"),true);WaterProbeReport->SetArrayField(TEXT("routes"),{});
    }
    if(Now>BeginTime+90){FinishWaterProbe(TEXT("Probe exceeded its 90 second wall deadline."));return;}
    auto BeginRoute=[&](bool Lake){
        Walking=true;Show("");
        // Current authored world positions, with the temple +4.5 m offset and
        // far-bank remap already applied. Placement happens once, before samples.
        const FVector Start=Lake?FVector(2344,-965,-65):FVector(2950,-200,90);
        const bool Placed=RestorePosition(Start,FRotator(0,Lake?-90:90,0));
        WaterProbeRoute=MakeShared<FJsonObject>();WaterProbeRoute->SetStringField(TEXT("name"),Lake?TEXT("near_bathing_ledge_to_lake"):TEXT("temple_forecourt_to_pond"));
        WaterProbeRoute->SetBoolField(TEXT("initial_placement_ok"),Placed);WaterProbeRoute->SetNumberField(TEXT("forward_hold_simulated_s"),1.8);WaterProbeRoute->SetNumberField(TEXT("settle_simulated_s"),1.0);
        WaterProbeRoute->SetArrayField(TEXT("samples"),{});
        auto Box=MakeShared<FJsonObject>();
        Box->SetNumberField(TEXT("min_x"),Lake?-325:2705);Box->SetNumberField(TEXT("max_x"),Lake?4765:3195);
        Box->SetNumberField(TEXT("min_y"),Lake?-3325:-115);Box->SetNumberField(TEXT("max_y"),Lake?-1075:315);
        Box->SetNumberField(TEXT("bottom_z"),Lake?-800:-110);Box->SetNumberField(TEXT("top_z"),Lake?-195:35);
        WaterProbeRoute->SetObjectField(TEXT("authored_water_box_cm"),Box);
        auto Routes=WaterProbeReport->GetArrayField(TEXT("routes"));Routes.Add(MakeShared<FJsonValueObject>(WaterProbeRoute));WaterProbeReport->SetArrayField(TEXT("routes"),Routes);
        WaterProbeStart=Sim;WaterProbeSampleAt=Sim+.1;WaterProbeSample(TEXT("initial_placement"));
        if(!Placed){FinishWaterProbe(TEXT("Could not place the walking capsule safely at the route start."));return false;}
        WaterProbeMoving=true;return true;
    };
    if(WaterProbeStage==0){if(Now<BeginTime+8||!InitialViewReady)return;if(BeginRoute(true))WaterProbeStage=1;return;}
    const double Elapsed=Sim-WaterProbeStart;
    if(Sim>=WaterProbeSampleAt){WaterProbeSample(WaterProbeMoving?TEXT("walking"):TEXT("settling"));WaterProbeSampleAt=Sim+.1;}
    if((WaterProbeStage==1||WaterProbeStage==3)&&Elapsed>=1.8){
        WaterProbeSample(TEXT("forward_hold_end"));WaterProbeMoving=false;
        // Stop horizontal input and braking only; gravity must keep acting if
        // this measurement occurs during a fall.
        if(auto* C=Cast<AWalkCharacter>(GetPawn())){auto* M=C->GetCharacterMovement();M->Velocity.X=0;M->Velocity.Y=0;}
        WaterProbeStage++;return;
    }
    if((WaterProbeStage==2||WaterProbeStage==4)&&Elapsed>=2.8){
        WaterProbeSample(TEXT("settled_endpoint"));
        if(WaterProbeStage==2){if(BeginRoute(false))WaterProbeStage=3;return;}
        FinishWaterProbe();
    }
}

void AWalkController::ReviewTick() {
    const double Now=FPlatformTime::Seconds();if(Now<BeginTime+10||Now<NextReview)return;
    const FString Dir=FPaths::ProjectSavedDir()/TEXT("WalkReview");IFileManager::Get().MakeDirectory(*Dir,true);
    const FString Stem=TEXT("review-")+ReviewPhoto.Replace(TEXT(" "),TEXT("_"));
    switch(ReviewStep++){
    case 0:{Action("photos");const int32 I=PhotoFiles.IndexOfByPredicate([this](const FString& F){return F.Contains(ReviewPhoto);});
        if(I==INDEX_NONE){UE_LOG(LogTemp,Warning,TEXT("WALKREVIEW no photograph matches %s"),*ReviewPhoto);ReviewPhoto.Empty();UKismetSystemLibrary::QuitGame(this,this,EQuitPreference::Quit,false);return;}
        PhotoPage=I/PhotosPerPage;Action(FString::Printf(TEXT("photo:%d"),I));NextReview=Now+1.5;break;}
    case 1:FScreenshotRequest::RequestScreenshot(Dir/(Stem+TEXT("-menu.png")),true,false);NextReview=Now+1;break;
    case 2:Action(PoseFor(PhotoName()).IsValid()?"align-saved":"align-here");ToastUntil=0;NextReview=Now+5;break;
    case 3:FScreenshotRequest::RequestScreenshot(Dir/(Stem+TEXT("-side.png")),true,false);NextReview=Now+1;break;
    case 4:AlignOverlay=true;NextReview=Now+1;break;
    case 5:FScreenshotRequest::RequestScreenshot(Dir/(Stem+TEXT("-overlay.png")),true,false);NextReview=Now+1.5;break;
    default:UE_LOG(LogTemp,Display,TEXT("WALKREVIEW done %s"),*PhotoName());ReviewPhoto.Empty();UKismetSystemLibrary::QuitGame(this,this,EQuitPreference::Quit,false);
    }
}
void AWalkController::SmokeTick() {
    // Runs only with -WalkSmoke, on a separate save slot. Real scene, collision and UI.
    double Now=FPlatformTime::Seconds();if(Now<BeginTime+8||Now<NextSmoke)return;NextSmoke=Now+1.5;
    // First-frame shader/geometry setup consumes wall time without advancing the
    // tour. Wait for simulated motion, with a deadline that still catches stalls.
    const bool TourMoved=TourTime>3&&TitleCamera&&TourPosition.Num()>0&&FVector::Dist(TitleCamera->GetActorLocation(),TourPosition[0])>100;
    if(!ResumeSmoke&&SmokeStep==0&&!TourMoved&&Now<BeginTime+45){NextSmoke=Now+.25;return;}
    auto Check=[this](bool Ok,const FString& What){UE_LOG(LogTemp,Display,TEXT("WALKTEST %s %s"),Ok?TEXT("PASS"):TEXT("FAIL"),*What);if(!Ok)SmokeFailures.Add(What);};
    const FString Dir=FPaths::ProjectSavedDir()/TEXT("WalkReview");IFileManager::Get().MakeDirectory(*Dir,true);
    auto Press=[](const FKey& K,bool Down=true,bool Up=true){
        if(Down)FSlateApplication::Get().ProcessKeyDownEvent(FKeyEvent(K,FModifierKeysState(),0,false,0,0));
        if(Up)FSlateApplication::Get().ProcessKeyUpEvent(FKeyEvent(K,FModifierKeysState(),0,false,0,0));};
    auto VisibleButton=[this](int32 I){
        if(!Menu||!Menu->Scroll||!Menu->Buttons.IsValidIndex(I))return false;
        const auto& B=Menu->Buttons[I]->GetCachedGeometry();const auto& A=Menu->Scroll->GetCachedGeometry();
        const auto P=B.GetAbsolutePosition(),Size=B.GetAbsoluteSize(),Area=A.GetAbsolutePosition(),AreaSize=A.GetAbsoluteSize();
        return Menu->Buttons[I]->GetVisibility().IsVisible()&&Size.X>0&&Size.Y>0&&P.Y>=Area.Y-1&&P.Y+Size.Y<=Area.Y+AreaSize.Y+1;
    };
    if(ResumeSmoke){
        if(SmokeStep++==0){Check(Save->HasWalk&&Save->Visited.Num()==Places.Num(),TEXT("cold restart loads the completed journal"));SmokePosition=Save->Position;StartWalk(true);return;}
        Check(Walking&&Page.IsEmpty()&&FVector::Dist(GetPawn()->GetActorLocation(),SmokePosition)<5,TEXT("cold restart restores saved position"));
        Check(Save->DisplayVersion==1&&!Save->Fullscreen&&Save->WindowResolution==FitWindow(FIntPoint(1600,900))&&Save->RenderScale==100,TEXT("cold restart loads restored safe display settings"));
        Check(DisplayMatches(Save),TEXT("cold restart applies saved resolution and independent render scale"));
        const auto Dpi=NativeDpiAwareness();
        Check(ConfiguredHighDpiEnabled()&&Dpi.PerMonitor(),TEXT("cold restart retains actual Windows per-monitor DPI awareness"));
        Check(Dpi.WindowDpi>0&&FMath::IsFinite(WindowDpiScale())&&FMath::IsNearlyEqual(WindowDpiScale(),Dpi.WindowDpi/96.f,.01f),TEXT("cold restart Slate scale matches native Windows DPI"));
        auto Report=MakeShared<FJsonObject>();Report->SetBoolField(TEXT("passed"),SmokeFailures.IsEmpty());Report->SetObjectField(TEXT("display"),DisplayReport());
        FString Json;auto Writer=TJsonWriterFactory<>::Create(&Json);FJsonSerializer::Serialize(Report,Writer);FFileHelper::SaveStringToFile(Json,*(Dir/TEXT("resume-smoke.json")));
        NextSmoke=TNumericLimits<double>::Max();UKismetSystemLibrary::QuitGame(this,this,EQuitPreference::Quit,false);return;
    }
    switch(SmokeStep++) {
    case 0: {
        int32 ActiveSkies=0, MappedSkies=0;
        for(TActorIterator<AActor> It(GetWorld());It;++It) {
            TInlineComponentArray<USkyLightComponent*> Lights;It->GetComponents(Lights);
            for(auto* Light:Lights)if(Light->bAffectsWorld&&Light->IsVisible()) {
                ++ActiveSkies;
                if(Light->SourceType==SLS_SpecifiedCubemap&&Light->Cubemap&&Light->Intensity>0&&
                   Light->Cubemap->GetName()==TEXT("overcast_soil_puresky_4k"))++MappedSkies;
            }
        }
        Check(ActiveSkies==1&&MappedSkies==1,TEXT("one active skylight retains the overcast HDR after runtime load"));
        const auto Dpi=NativeDpiAwareness();
        Check(ConfiguredHighDpiEnabled()&&Dpi.PerMonitor(),TEXT("Windows confirms per-monitor DPI awareness for the game process, thread and window"));
        Check(Dpi.WindowDpi>0&&FMath::IsFinite(WindowDpiScale())&&FMath::IsNearlyEqual(WindowDpiScale(),Dpi.WindowDpi/96.f,.01f),TEXT("Slate window scale matches the native Windows DPI"));
        Check(IConsoleManager::Get().FindConsoleVariable(TEXT("r.RayTracing.ResidentGeometryMemoryPoolSizeInMB"))->GetInt()==1024,TEXT("ray-tracing geometry pool configured for this scene"));
        Check(TourPosition.Num()>1000&&TourPeriod>1000&&TourLoopStart>0,TEXT("guided tour loaded: opening flight, then a loop"));
        Check(!Walking&&Page.IsEmpty()&&!Menu.IsValid()&&!bShowMouseCursor&&!IsPaused()&&GetViewTarget()==TitleCamera,TEXT("tour starts on launch without a menu"));
        const double TourDistance=TitleCamera&&TourPosition.Num()?FVector::Dist(TitleCamera->GetActorLocation(),TourPosition[0]):0;
        UE_LOG(LogTemp,Display,TEXT("WALKTEST tour startup: %.2f simulated seconds, %.1f cm moved, %.2f wall seconds"),TourTime,TourDistance,Now-BeginTime);
        Check(TourTime>3&&TitleCamera&&TourDistance>100,TEXT("tour camera moves along the path"));
        FScreenshotRequest::RequestScreenshot(Dir/TEXT("00-tour.png"),true,false);
        Press(EKeys::Escape);break;
    }
    case 1: {
        Check(Page=="home"&&Menu.IsValid()&&bShowMouseCursor&&IsPaused(),TEXT("Esc opens the menu over the paused tour"));
        Check(Menu&&Menu->Buttons[0]->HasKeyboardFocus(),TEXT("title primary action has keyboard focus"));
        Press(EKeys::Down,true,false);
        Check(Menu&&Menu->Buttons[1]->HasKeyboardFocus(),TEXT("arrow key navigates menu"));
        Press(EKeys::Gamepad_DPad_Up,true,false);
        Check(Menu&&Menu->Buttons[0]->HasKeyboardFocus(),TEXT("controller D-pad navigates menu"));
        FScreenshotRequest::RequestScreenshot(Dir/TEXT("01-title.png"),true,false);break;
    }
    case 2: {
        SmokeTourTime=TourTime;Press(EKeys::Escape);
        Check(Page.IsEmpty()&&!Menu.IsValid()&&!Walking,TEXT("Esc in the menu returns to the tour"));break;
    }
    case 3: {
        Check(!Walking&&Page.IsEmpty()&&TourTime>SmokeTourTime+.5,TEXT("tour resumes after the menu"));
        Press(EKeys::Gamepad_Special_Right);break;
    }
    case 4: {
        Check(Page=="home"&&Menu.IsValid()&&!Walking,TEXT("Start opens the menu during the tour"));
        Press(EKeys::Gamepad_FaceButton_Bottom);break;
    }
    case 5:Check(Walking&&Page.IsEmpty()&&!IsPaused()&&!bShowMouseCursor,TEXT("begin captures mouse and starts walk"));Check(GetPawn()&&GetPawn()->GetActorLocation().Z>-100,TEXT("player on ground"));Observe();break;
    case 6:Check(Save->Visited.Contains("house"),TEXT("notice entrance adds journal entry"));FScreenshotRequest::RequestScreenshot(Dir/TEXT("02-place.png"),true,false);Show("");break;
    case 7:PauseWalk();Check(Page=="pause"&&IsPaused(),TEXT("pause stops world"));FScreenshotRequest::RequestScreenshot(Dir/TEXT("03-pause.png"),true,false);break;
    case 8:{
        if(SmokeSettingsStep==0) {
            Action("settings");Action("fov");Action("invert");Check(Save->Fov==90&&Save->InvertY,TEXT("comfort settings change"));
            Save->Fullscreen=false;Save->WindowResolution=WindowChoices()[0];Save->RenderScale=100;ApplySettings();
            SmokeSettingsStep++;SmokeStep--;return;
        }
        if(SmokeSettingsStep==1) {
            Check(ViewportResolution()==WindowChoices()[0],TEXT("settings navigation runs at the smallest offered window"));
            Check(Menu&&Menu->Buttons[0]->HasKeyboardFocus(),TEXT("settings first row has keyboard focus"));
            if(Menu)for(int32 I=1;I<Menu->Buttons.Num();I++)Press(I%2?EKeys::Down:EKeys::Gamepad_DPad_Down);
            SmokeSettingsStep++;SmokeStep--;return;
        }
        if(SmokeSettingsStep==2) {
            Check(Menu&&Menu->Buttons.Last()->HasKeyboardFocus()&&VisibleButton(Menu->Buttons.Num()-1),TEXT("arrows and D-pad bring Settings Back into view at the smallest window"));
            FScreenshotRequest::RequestScreenshot(Dir/TEXT("04-settings-bottom.png"),true,false);
            SmokeSettingsStep++;SmokeStep--;return;
        }
        if(SmokeSettingsStep==3) {
            Press(EKeys::Gamepad_DPad_Up);Check(Menu&&Menu->Buttons[Menu->Buttons.Num()-2]->HasKeyboardFocus(),TEXT("D-pad reaches Restore defaults"));
            Press(EKeys::Up);Press(EKeys::Enter);
            Check(Save->RenderScale==67,TEXT("Enter activates the render-scale setting after scrolling"));
            SmokeSettingsStep++;SmokeStep--;return;
        }
        if(SmokeSettingsStep==4) {
            Check(Menu&&Menu->Buttons[Menu->Buttons.Num()-3]->HasKeyboardFocus()&&VisibleButton(Menu->Buttons.Num()-3),TEXT("changed setting retains focus and stays visible after the menu rebuild"));
            Press(EKeys::Up);Check(Menu&&Menu->Buttons[Menu->Buttons.Num()-4]->HasKeyboardFocus(),TEXT("resolution row has focus before Enter"));
            const auto Choices=WindowChoices();SmokeWindowResolution=Choices[Choices.Num()>1?1:0];
            Press(EKeys::Enter);Check(Save->WindowResolution==SmokeWindowResolution,TEXT("Enter advances to the next offered resolution"));
            SmokeSettingsStep++;SmokeStep--;return;
        }
        if(SmokeSettingsStep==5) {
            Check(Menu&&Menu->Buttons[Menu->Buttons.Num()-4]->HasKeyboardFocus()&&Save->WindowResolution==SmokeWindowResolution,TEXT("resolution row retains focus after its menu rebuild"));
            Check(DisplayMatches(Save),TEXT("selected resolution and render scale reach the viewport before changing graphics quality"));
            Press(EKeys::Up);Press(EKeys::Gamepad_DPad_Up);
            Check(Menu&&Menu->Buttons[Menu->Buttons.Num()-6]->HasKeyboardFocus(),TEXT("graphics row has focus before controller A"));
            Press(EKeys::Gamepad_FaceButton_Bottom);SmokeSettingsStep++;SmokeStep--;return;
        }
        Check(Menu&&Menu->Buttons[Menu->Buttons.Num()-6]->HasKeyboardFocus(),TEXT("graphics row retains focus after its menu rebuild"));
        Check(Save->RenderScale==67&&Save->Quality==3,TEXT("graphics quality preserves the selected independent render scale"));
        FScreenshotRequest::RequestScreenshot(Dir/TEXT("04-settings.png"),true,false);break;
    }
    case 9:{
        if(SmokeDisplayStep==0) {
            Check(DisplayMatches(Save)&&Save->WindowResolution==SmokeWindowResolution,TEXT("window resolution and 67 percent render scale reach the viewport"));
            auto* Reload=Cast<UWalkSave>(UGameplayStatics::LoadGameFromSlot(Slot(),0));
            Check(Reload&&Reload->Fov==90&&Reload->Visited.Contains("house")&&Reload->DisplayVersion==1&&Reload->WindowResolution==SmokeWindowResolution&&Reload->RenderScale==67&&Reload->Quality==3&&!Reload->Fullscreen,TEXT("comfort, display settings and journal persist"));
            SmokeDisplayReport=MakeShared<FJsonObject>();SmokeDisplayReport->SetObjectField(TEXT("windowed"),DisplayReport());
            Action("display");SmokeDisplayStep++;SmokeStep--;return;
        }
        if(SmokeDisplayStep==1) {
            Check(Save->Fullscreen&&DisplayMatches(Save)&&Save->WindowResolution==SmokeWindowResolution,TEXT("borderless uses native monitor resolution without changing window preference or scale"));
            SmokeDisplayReport->SetObjectField(TEXT("borderless"),DisplayReport());Action("display");SmokeDisplayStep++;SmokeStep--;return;
        }
        Check(!Save->Fullscreen&&DisplayMatches(Save)&&Save->WindowResolution==SmokeWindowResolution,TEXT("leaving borderless restores window resolution and render scale"));
        SmokeDisplayReport->SetObjectField(TEXT("windowed_restored"),DisplayReport());
        // The smoke run has an isolated UserDir/save slot. Restore modest windowed
        // settings before the rest of its checks and the separate cold restart.
        Action("defaults");Action("back");Action("title");Action("new");Check(Page=="new-confirm",TEXT("new walk protects existing save"));Action("back");Action("continue");break;
    }
    case 10:Check(Walking&&Save->Visited.Contains("house"),TEXT("continue restores progress"));OpenJournal();FScreenshotRequest::RequestScreenshot(Dir/TEXT("05-journal.png"),true,false);break;
    default:{
        int32 I=SmokeStep-12;
        if(I>0&&I<=Places.Num()){
            Check(Nearby==I-1,TEXT("discovery reachable: ")+Places[I-1].Title);
            Observe();Check(Save->Visited.Contains(Places[I-1].Id),TEXT("journal records: ")+Places[I-1].Title);Show("");
        }
        if(Places.IsValidIndex(I)){Check(Travel(I),TEXT("safe landing: ")+Places[I].Title);Show("");FScreenshotRequest::RequestScreenshot(Dir/FString::Printf(TEXT("place-%d.png"),I),true,false);return;}
        if(I==Places.Num()){Check(RestorePosition(FVector(-650,515,97),FRotator(0,180,0)),TEXT("stairs test start"));Show("");SmokeMoving=true;NextSmoke=Now+1.6;return;}
        if(I==Places.Num()+1){SmokeMoving=false;FVector P=GetPawn()->GetActorLocation();Check(P.X<-810&&P.Z>120,TEXT("walk up north-south entry stairs: ")+P.ToString());SetControlRotation(FRotator(0,0,0));SmokeMoving=true;NextSmoke=Now+1.6;return;}
        if(I==Places.Num()+2){SmokeMoving=false;FVector P=GetPawn()->GetActorLocation();Check(P.X>-725&&P.Z<115,TEXT("walk down entry stairs: ")+P.ToString());Show("pause");SmokePosition=GetPawn()->GetActorLocation();return;}
        if(I==Places.Num()+3){
            auto BeginPortico=[&](int32 Step){
                const float X=Step<5?3615.f:4655.f;
                const bool Placed=RestorePosition(FVector(X,1440,100),FRotator(0,-90,0));
                Check(Placed,TEXT("portico stairs start on the court: ")+FString::SanitizeFloat(X));
                Show("");SmokeMoving=Placed;SmokeTempleStairStep=Step;SmokeTempleDeadline=Now+8;NextSmoke=Now+.8;SmokeStep--;
            };
            if(SmokeTempleStairStep==0) {
                Check(FVector::Dist(SmokePosition,GetPawn()->GetActorLocation())<.5,TEXT("pause keeps physical position fixed"));Action("rescue");Check(FVector::Dist2D(GetPawn()->GetActorLocation(),Places[0].Feet)<100,TEXT("return to entrance recovery"));
                // Main a4c5efc: east rear-ledge stair x44.6, local z3.50..3.95,
                // floor .39 -> .85 m. Temple shift +4.5 maps it to UE y800..845.
                const bool Placed=RestorePosition(FVector(4460,745,129),FRotator(0,90,0));
                Check(Placed,TEXT("rear ledge stairs start on the lower entrance floor"));Show("");SmokeMoving=Placed;
                SmokeTempleStairStep=1;SmokeTempleWalkAt=GetWorld()->GetTimeSeconds();SmokeTempleDeadline=Now+8;NextSmoke=Now+1.3;SmokeStep--;return;
            }
            if(SmokeTempleStairStep>=3) {
                if(SmokeMoving&&Now<SmokeTempleDeadline){NextSmoke=Now+.1;SmokeStep--;return;}
                const bool Arrived=!SmokeMoving;SmokeMoving=false;auto* C=Cast<AWalkCharacter>(GetPawn());C->GetCharacterMovement()->StopMovementImmediately();const FVector P=C->GetActorLocation();
                const bool Up=(SmokeTempleStairStep-3)%2==0;const float X=SmokeTempleStairStep<5?3615.f:4655.f;
                // Pass 20 source routes x36.15/46.55, local z9.90 -> 8.78,
                // court .10 -> platform .85 m through three .25 m risers.
                const bool Endpoint=Up?P.Y>=1305&&P.Y<=1335&&P.Z>165&&P.Z<185:P.Y>=1435&&P.Y<=1460&&P.Z>95&&P.Z<115;
                Check(Arrived&&FMath::Abs(P.X-X)<30&&Endpoint&&C->GetCharacterMovement()->IsMovingOnGround(),FString::Printf(TEXT("walk %s the %s portico steps: %s"),Up?TEXT("up"):TEXT("down"),X<4000?TEXT("west"):TEXT("east"),*P.ToString()));
                if(Up){SetControlRotation(FRotator(0,90,0));SmokeMoving=true;SmokeTempleStairStep++;SmokeTempleDeadline=Now+8;NextSmoke=Now+.8;SmokeStep--;return;}
                if(SmokeTempleStairStep==4){BeginPortico(5);return;}
                Check(Travel(0),TEXT("all temple stair routes restore the entrance safely"));Show("");return;
            }
            const double Walked=GetWorld()->GetTimeSeconds()-SmokeTempleWalkAt;
            if(Walked<1.2&&Now<SmokeTempleDeadline){NextSmoke=Now+.1;SmokeStep--;return;}
            SmokeMoving=false;auto* C=Cast<AWalkCharacter>(GetPawn());C->GetCharacterMovement()->StopMovementImmediately();const FVector P=C->GetActorLocation();
            if(SmokeTempleStairStep==1) {
                Check(Walked>=1.2&&FMath::Abs(P.X-4460)<30&&P.Y>880&&P.Y<1040&&P.Z>165&&P.Z<185&&C->GetCharacterMovement()->IsMovingOnGround(),TEXT("walk up the entrance rear ledge steps: ")+P.ToString());
                SetControlRotation(FRotator(0,-90,0));SmokeMoving=true;SmokeTempleStairStep=2;
                SmokeTempleWalkAt=GetWorld()->GetTimeSeconds();SmokeTempleDeadline=Now+8;NextSmoke=Now+1.3;SmokeStep--;return;
            }
            Check(Walked>=1.2&&FMath::Abs(P.X-4460)<30&&P.Y<790&&P.Y>650&&P.Z>118&&P.Z<140&&C->GetCharacterMovement()->IsMovingOnGround(),TEXT("walk down the entrance rear ledge steps: ")+P.ToString());
            BeginPortico(3);return;
        }
        if(I==Places.Num()+4){
            auto* C=Cast<AWalkCharacter>(GetPawn());
            auto Pitch=[&](bool Invert,bool Stick){SetControlRotation(FRotator::ZeroRotator);RotationInput=FRotator::ZeroRotator;Save->InvertY=Invert;
                if(Stick)C->StickY(1);else C->LookY(1);UpdateRotation(1.f/60);RotationInput=FRotator::ZeroRotator;return FRotator::NormalizeAxis(GetControlRotation().Pitch);};
            Check(Pitch(false,false)<0,TEXT("default: mouse up looks down"));
            Check(Pitch(false,true)<0,TEXT("default: right stick up looks down"));
            Check(Pitch(true,false)>0&&Pitch(true,true)>0,TEXT("invert look: up looks up"));
            Save->InvertY=false;SetControlRotation(FRotator::ZeroRotator);
            UWalkSave* Old=Cast<UWalkSave>(UGameplayStatics::CreateSaveGameObject(UWalkSave::StaticClass()));Old->InvertY=true;Old->LookVersion=0;UpgradeSave(Old);
            UWalkSave* Current=Cast<UWalkSave>(UGameplayStatics::CreateSaveGameObject(UWalkSave::StaticClass()));UpgradeSave(Current);Current->InvertY=true;UpgradeSave(Current);
            Check(!Old->InvertY&&Old->LookVersion==1&&Current->InvertY,TEXT("older saves get the new look default once; later choices stay"));
            Old->Fullscreen=true;Old->Quality=1;Old->Fov=95;Old->Sensitivity=1.5f;Old->HasWalk=true;Old->Visited.Add(TEXT("house"));
            UpgradeDisplaySave(Old,true);
            Check(Old->DisplayVersion==1&&Old->WindowResolution==FitWindow(UGameUserSettings::GetGameUserSettings()->GetScreenResolution())&&Old->RenderScale==AppliedRenderScale()
                &&Old->Fullscreen&&Old->Quality==1&&Old->Fov==95&&Old->Sensitivity==1.5f&&Old->HasWalk&&Old->Visited.Contains(TEXT("house")),TEXT("legacy display migration preserves engine preferences, comfort and progress"));
            Old->WindowResolution=WindowChoices()[0];Old->RenderScale=67;UpgradeDisplaySave(Old,true);
            Check(Old->WindowResolution==WindowChoices()[0]&&Old->RenderScale==67,TEXT("display migration runs once and preserves later choices"));return;
        }
        if(I==Places.Num()+5){
            Show("pause");Action("tour");
            Check(!Walking&&Page.IsEmpty()&&GetViewTarget()==TitleCamera,TEXT("pause menu starts the guided tour"));
            // Jump into the walking loop, then hold W as a player would.
            TourTime=(TourLoopStart+10*TourFps)/TourFps;TickTour(0);Press(EKeys::W,true,false);NextSmoke=Now+.25;return;
        }
        if(I==Places.Num()+6){
            Press(EKeys::W,false,true);
            Check(Walking&&Page.IsEmpty()&&GetViewTarget()==GetPawn(),TEXT("walking input leaves the tour"));
            Check(FVector::Dist2D(GetPawn()->GetActorLocation(),SmokePosition)<120,TEXT("walk continues from the tour camera's spot: ")+GetPawn()->GetActorLocation().ToString()+TEXT(" vs ")+SmokePosition.ToString());
            FScreenshotRequest::RequestScreenshot(Dir/TEXT("06-takeover.png"),true,false);return;
        }
        const FVector Posed(1234,-567,321),Away(0,0,500);
        auto Eye=[this](const FVector& P){return Aligning&&Page.IsEmpty()&&AlignCamera&&FVector::Dist(AlignCamera->GetActorLocation(),P)<.5;};
        if(I==Places.Num()+7){
            // Photo alignment and notes, against the generated pictures in the smoke folder.
            SmokePosition=GetPawn()->GetActorLocation();
            Show("pause");Action("photos");
            Check(Page=="photos"&&PhotoFiles.Num()==2&&!PoseFor(PhotoFiles[0]).IsValid(),TEXT("photo browser lists the folder's pictures"));
            Action("photo:0");Check(Page=="photo:0"&&PhotoTexture&&FMath::IsNearlyEqual(AlignAspect,64.f/48,.01f),TEXT("photo page loads the picture"));
            Check(SaveLooseNote(TEXT("legacy spot note"),FString())&&SaveLooseNote(TEXT("other photo note"),PhotoFiles[1]),TEXT("seed existing spot and other-photo note history"));
            Action("note");NoteDraft=TEXT("smoke unaligned note");Action("note-save");
            Check(Page=="photo:0"&&!PoseFor(PhotoName()).IsValid()&&PhotoNote(PhotoName())==TEXT("smoke unaligned note"),TEXT("unaligned note saves and appears on the photo page"));
            Action("photos");Action("photo:0");Action("note");
            Check(NoteDraft==TEXT("smoke unaligned note")&&Menu&&Menu->NoteBox&&Menu->NoteBox->GetText().ToString()==NoteDraft,TEXT("unaligned photo note reopens in the editor"));
            NoteDraft=TEXT("revised unaligned note");Action("note-save");
            // Simulate an outside editor, retaining older entries and an unknown legacy root field.
            const auto Legacy=ReadJson(NotesPath());const TArray<TSharedPtr<FJsonValue>>* History=nullptr;
            const bool HasHistory=Legacy.IsValid()&&Legacy->TryGetArrayField(TEXT("notes"),History)&&History->Num()==4;
            Check(HasHistory,TEXT("editing an unaligned photo appends without erasing legacy history"));
            if(HasHistory){auto Entries=*History;auto External=MakeShared<FJsonObject>();External->SetStringField(TEXT("photo"),PhotoName());External->SetStringField(TEXT("text"),TEXT("outside photo note"));
                Entries.Add(MakeShared<FJsonValueObject>(External));Legacy->SetArrayField(TEXT("notes"),Entries);Legacy->SetStringField(TEXT("legacyMarker"),TEXT("keep me"));
                Check(WriteJson(Legacy.ToSharedRef(),NotesPath()),TEXT("outside note update written in the isolated smoke folder"));}
            Action("note");Check(NoteDraft==TEXT("outside photo note"),TEXT("opening the note editor re-reads outside updates"));Back();
            PoseRoot.Reset();NotesRoot.Reset();Action("photos");
            Check(PhotoNote(PhotoFiles[0])==TEXT("outside photo note")&&PhotoNote(PhotoFiles[1])==TEXT("other photo note"),TEXT("photo browser reloads the latest note for each unaligned photo"));
            Action("photo:0");Action("note");Check(NoteDraft==TEXT("outside photo note"),TEXT("unaligned note survives a full JSON reload"));Back();
            FString BeforeAlignment;FFileHelper::LoadFileToString(BeforeAlignment,*NotesPath());
            for(const FString& Invalid:{FString(TEXT("{\"notes\":\"legacy\"}")),FString(TEXT("{"))}){
                Check(FFileHelper::SaveStringToFile(Invalid,*NotesPath()),TEXT("seed unreadable note history in the smoke folder"));
                Check(!SaveLooseNote(TEXT("must not replace history"),PhotoName())&&!SavePose(PhotoName(),true,nullptr),TEXT("invalid note history blocks append and first alignment"));
                FString Unchanged;FFileHelper::LoadFileToString(Unchanged,*NotesPath());Check(Unchanged==Invalid,TEXT("invalid legacy note history remains untouched"));
            }
            Check(FFileHelper::SaveStringToFile(BeforeAlignment,*NotesPath(),FFileHelper::EEncodingOptions::ForceUTF8WithoutBOM),TEXT("restore valid smoke note history"));
            Action("align-here");Check(Aligning&&Page.IsEmpty()&&AlignCamera&&GetViewTarget()==AlignCamera&&!IsPaused(),TEXT("alignment mode flies a free camera"));
            AlignCamera->SetActorLocationAndRotation(Posed,FRotator(-10,37,2));AlignVFov=52;ApplyAlignLens();
            Check(SavePose(PhotoName(),true,nullptr),TEXT("alignment saves"));
            PoseRoot.Reset();LoadPoses();const auto R=PoseFor(PhotoFiles[0]);const TSharedPtr<FJsonObject>* Cam=nullptr;const TArray<TSharedPtr<FJsonValue>>* P=nullptr;
            const bool Stored=R.IsValid()&&R->TryGetObjectField(TEXT("camera"),Cam)&&(*Cam)->TryGetArrayField(TEXT("position"),P)&&P->Num()==3
                &&FMath::IsNearlyEqual((*P)[0]->AsNumber(),12.34,1e-3)&&FMath::IsNearlyEqual((*P)[1]->AsNumber(),3.21,1e-3)&&FMath::IsNearlyEqual((*P)[2]->AsNumber(),-5.67,1e-3)
                &&FMath::IsNearlyEqual((*Cam)->GetNumberField(TEXT("verticalFov")),52.0,1e-3)&&R->GetStringField(TEXT("id"))==TEXT("file:smoke photo.png");
            Check(Stored,TEXT("saved pose uses the web tool's record and coordinates"));
            FString Promoted,AfterAlignment;FFileHelper::LoadFileToString(AfterAlignment,*NotesPath());
            Check(R.IsValid()&&R->TryGetStringField(TEXT("notes"),Promoted)&&Promoted==TEXT("outside photo note")&&PhotoNote(PhotoFiles[0])==Promoted&&AfterAlignment==BeforeAlignment,TEXT("first alignment promotes the latest photo note and leaves loose history unchanged"));
            AlignCamera->SetActorLocationAndRotation(Away,FRotator::ZeroRotator);PauseWalk();
            Check(Page=="photo:0"&&IsPaused(),TEXT("Esc opens the photo menu while aligning"));
            Action("align-saved");
            Check(Eye(Posed)&&AlignCamera->GetActorQuat().AngularDistance(FRotator(-10,37,2).Quaternion())<.002f,TEXT("go to saved position restores the saved view"));
            // Without the menu: step through the photographs and fly back to the saved pose.
            AlignCamera->SetActorLocationAndRotation(Away,FRotator::ZeroRotator);
            Check(AlignStep(1)&&PhotoIndex==1&&FMath::IsNearlyEqual(AlignAspect,48.f/64,.01f)&&Eye(Away),TEXT("next photo opens while aligning; an unaligned one keeps the camera"));
            Check(!AlignToSaved()&&Eye(Away),TEXT("no saved position to go to on an unaligned photo"));
            AlignVFov=70;
            Check(AlignStep(1)&&PhotoIndex==0&&Eye(Posed)&&FMath::IsNearlyEqual(AlignVFov,52.f,.01f),TEXT("next photo wraps round and flies to its saved pose and lens"));
            Check(AlignStep(-1)&&PhotoIndex==1&&AlignStep(-1)&&PhotoIndex==0,TEXT("previous photo wraps round"));
            AlignCamera->SetActorLocationAndRotation(Away,FRotator::ZeroRotator);
            Check(AlignToSaved()&&Eye(Posed)&&AlignCamera->GetActorQuat().AngularDistance(FRotator(-10,37,2).Quaternion())<.002f,TEXT("go to saved position works without the menu"));
            // The same from the controller, one button a step: RB, LB, Y, A, B.
            AlignCamera->SetActorLocationAndRotation(Away,FRotator::ZeroRotator);Press(EKeys::Gamepad_RightShoulder);return;
        }
        if(I==Places.Num()+8){Check(PhotoIndex==1&&Eye(Away),TEXT("RB opens the next photo"));Press(EKeys::Gamepad_LeftShoulder);return;}
        if(I==Places.Num()+9){Check(PhotoIndex==0&&Eye(Posed),TEXT("LB opens the previous photo at its saved pose"));AlignCamera->SetActorLocationAndRotation(Away,FRotator::ZeroRotator);Press(EKeys::Gamepad_FaceButton_Top);return;}
        if(I==Places.Num()+10){Check(Eye(Posed),TEXT("Y goes to the saved position"));AlignCamera->SetActorLocationAndRotation(FVector(1300,-500,330),FRotator(0,90,0));Press(EKeys::Gamepad_FaceButton_Bottom);return;}
        if(I==Places.Num()+11){
            PoseRoot.Reset();LoadPoses();const auto R=PoseFor(PhotoFiles[0]);const TSharedPtr<FJsonObject>* Cam=nullptr;const TArray<TSharedPtr<FJsonValue>>* P=nullptr;
            Check(R.IsValid()&&R->TryGetObjectField(TEXT("camera"),Cam)&&(*Cam)->TryGetArrayField(TEXT("position"),P)&&P->Num()==3&&FMath::IsNearlyEqual((*P)[0]->AsNumber(),13.0,1e-3)&&FMath::IsNearlyEqual((*P)[1]->AsNumber(),3.3,1e-3)&&FMath::IsNearlyEqual((*P)[2]->AsNumber(),-5.0,1e-3),TEXT("A saves the alignment"));
            Press(EKeys::Gamepad_FaceButton_Right);return;
        }
        if(I==Places.Num()+12){
            Check(Aligning&&Page=="photo:0"&&IsPaused(),TEXT("B opens the photo menu while aligning"));
            Action("note");NoteDraft=TEXT("smoke note");Action("note-save");
            PoseRoot.Reset();LoadPoses();FString Note;const auto R2=PoseFor(PhotoFiles[0]);
            Check(Page=="photo:0"&&R2.IsValid()&&R2->TryGetStringField(TEXT("notes"),Note)&&Note==TEXT("smoke note"),TEXT("photo note saves into the pose"));
            Action("note");NoteDraft.Empty();Action("note-save");
            Check(PhotoNote(PhotoFiles[0]).IsEmpty(),TEXT("clearing an aligned note does not resurrect loose history"));
            Action("note");NoteDraft=TEXT("smoke note");Action("note-save");
            FScreenshotRequest::RequestScreenshot(Dir/TEXT("07-photo.png"),true,false);
            Action("photos");Back();
            Check(!Aligning&&Page=="pause"&&Walking&&GetViewTarget()==GetPawn()&&FVector::Dist(SmokePosition,GetPawn()->GetActorLocation())<1,TEXT("leaving alignment returns to the paused walk where it was"));
            Action("walknote");NoteDraft=TEXT("smoke walk note");Action("walknote-save");
            const auto Loose=ReadJson(PhotoDir/TEXT("unreal-notes.json"));const TArray<TSharedPtr<FJsonValue>>* Notes=nullptr;
            Check(Page=="pause"&&Loose.IsValid()&&Loose->TryGetArrayField(TEXT("notes"),Notes)&&Notes->Num()==6
                &&(*Notes)[0]->AsObject()->GetStringField(TEXT("text"))==TEXT("legacy spot note")&&(*Notes)[1]->AsObject()->GetStringField(TEXT("text"))==TEXT("other photo note")
                &&(*Notes)[2]->AsObject()->GetStringField(TEXT("text"))==TEXT("smoke unaligned note")&&(*Notes)[3]->AsObject()->GetStringField(TEXT("text"))==TEXT("revised unaligned note")
                &&(*Notes)[4]->AsObject()->GetStringField(TEXT("text"))==TEXT("outside photo note")&&(*Notes)[5]->AsObject()->GetStringField(TEXT("text"))==TEXT("smoke walk note")
                &&Loose->GetStringField(TEXT("legacyMarker"))==TEXT("keep me"),TEXT("walk note appends its spot while preserving all photo/spot history and legacy fields"));
            Show("");return;
        }
        Check(Persist(true),TEXT("final save succeeds"));
        TSharedRef<FJsonObject> Report=MakeShared<FJsonObject>();Report->SetBoolField(TEXT("passed"),SmokeFailures.IsEmpty());TArray<TSharedPtr<FJsonValue>> Errors;for(auto& E:SmokeFailures)Errors.Add(MakeShared<FJsonValueString>(E));Report->SetArrayField(TEXT("failures"),Errors);
        Report->SetObjectField(TEXT("display"),DisplayReport());if(SmokeDisplayReport)Report->SetObjectField(TEXT("tested_display_modes"),SmokeDisplayReport);
        FString Json;auto Writer=TJsonWriterFactory<>::Create(&Json);FJsonSerializer::Serialize(Report,Writer);FFileHelper::SaveStringToFile(Json,*(Dir/TEXT("smoke.json")));
        NextSmoke=TNumericLimits<double>::Max();
        UKismetSystemLibrary::QuitGame(this,this,EQuitPreference::Quit,false);break;
    }}
}
