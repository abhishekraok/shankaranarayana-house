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
#include "Engine/GameViewportClient.h"
#include "Engine/World.h"
#include "Engine/Engine.h"
#include "Engine/TextureCube.h"
#include "EngineUtils.h"
#include "Sound/SoundWave.h"
#include "UnrealClient.h"
#include "Framework/Application/SlateApplication.h"
#include "Widgets/SCompoundWidget.h"
#include "Widgets/SOverlay.h"
#include "Widgets/SBoxPanel.h"
#include "Widgets/Layout/SBox.h"
#include "Widgets/Layout/SBorder.h"
#include "Widgets/Layout/SScrollBox.h"
#include "Widgets/Layout/SScaleBox.h"
#include "Widgets/Text/STextBlock.h"
#include "Widgets/Input/SButton.h"
#include "Styling/CoreStyle.h"
#include "Misc/FileHelper.h"
#include "Misc/Paths.h"
#include "Misc/CommandLine.h"
#include "Misc/Parse.h"
#include "Serialization/JsonWriter.h"
#include "Serialization/JsonSerializer.h"
#include "Serialization/JsonReader.h"

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
}

class SQuietMenu : public SCompoundWidget {
public:
    SLATE_BEGIN_ARGS(SQuietMenu) {} SLATE_ARGUMENT(AWalkController*, Owner) SLATE_END_ARGS()
    TWeakObjectPtr<AWalkController> Owner;
    TArray<TSharedPtr<SButton>> Buttons;
    TSharedPtr<SVerticalBox> Rows;
    void Construct(const FArguments& Args) {
        Owner=Args._Owner;
        ChildSlot [ SNew(SBorder).BorderImage(FCoreStyle::Get().GetBrush("WhiteBrush")).BorderBackgroundColor(FLinearColor(0.008f,.018f,.016f,.28f)).Padding(0)
            [ SNew(SScaleBox).Stretch(EStretch::ScaleToFit).HAlign(HAlign_Left).VAlign(VAlign_Center)
              [ SNew(SBox).WidthOverride(660).HeightOverride(850)
                [ SNew(SBorder).BorderImage(FCoreStyle::Get().GetBrush("WhiteBrush")).BorderBackgroundColor(FLinearColor(.012f,.025f,.022f,.96f)).Padding(FMargin(65,40))
                  [ SAssignNew(Rows,SVerticalBox) ] ] ] ] ];
        Build();
    }
    virtual bool SupportsKeyboardFocus() const override { return true; }
    virtual FReply OnKeyDown(const FGeometry& G,const FKeyEvent& E) override {
        const FKey K=E.GetKey();
        if(K==EKeys::Escape||K==EKeys::Gamepad_FaceButton_Right||K==EKeys::Gamepad_Special_Right) { if(Owner.IsValid()) Owner->Back(); return FReply::Handled(); }
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
            Add(TEXT("Settings"),"settings"); Add(TEXT("How to walk"),"controls"); Add(TEXT("Quit"),"quit");
            Rows->AddSlot().AutoHeight().Padding(0,24,0,0)[Label(TEXT("A reconstruction from photographs, 2011–2013.\nSome spaces and details are approximate."),14,Muted)];
        } else if(O->Page=="pause") {
            Heading(TEXT("Take a breath"),TEXT("Your walk is paused."));
            Add(TEXT("Resume"),"resume"); Add(TEXT("Places journal"),"journal");
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
            Add(TEXT("Restore default settings"),"defaults"); Add(TEXT("Back"),"back");
            Rows->AddSlot().AutoHeight().Padding(0,10)[Label(TEXT("Select a setting to cycle its choices."),13,Muted)];
        } else if(O->Page=="controls") {
            Heading(TEXT("How to walk"),TEXT("Mouse & keyboard, or a controller."));
            Rows->AddSlot().AutoHeight().Padding(0,0,0,24)[Label(TEXT("W A S D / left stick     Walk\nMouse / right stick      Look around\nShift / right trigger      Walk a little faster\nE / A                            Notice a place\nJ / Y                             Places journal\nEsc / Menu                  Pause & resume\n\nThe guided tour plays on launch. Walk or move a stick to leave it and walk on from there.\n\nIn menus: arrows or D-pad, Enter / A to select, Esc / B to go back.\n\nStairs are walked, not jumped. If you lose your way, use Return to the house entrance from Pause.\n\nProgress saves while walking, when you notice a place, and when you leave."),18)];
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
        } else if(O->Page=="new-confirm") {
            Heading(TEXT("Begin again?"),TEXT("This replaces your saved walk and places journal. Your settings stay."));
            Add(TEXT("Keep my current walk"),"back"); Add(TEXT("Begin a new walk"),"new-confirmed");
        }
        Rows->AddSlot().FillHeight(1);
        Rows->AddSlot().AutoHeight().Padding(0,20,0,0)
            [SNew(STextBlock).Text_Lambda([Weak=Owner](){auto* C=Weak.Get();return Txt(C&&FPlatformTime::Seconds()<C->ToastUntil?C->Toast:TEXT("↑ ↓   Choose      Enter / A   Select      Esc / B   Back"));})
             .Font(FCoreStyle::GetDefaultFontStyle("Regular",13)).ColorAndOpacity(Muted).AutoWrapText(true)];
    }
    void Focus(int32 Index=0) { if(Buttons.Num()) FSlateApplication::Get().SetKeyboardFocus(Buttons[FMath::Clamp(Index,0,Buttons.Num()-1)],EFocusCause::SetDirectly); }
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
    auto* C=Cast<AWalkController>(Controller); if(!C||C->Walking) return false;
    if(TakesOver&&FMath::Abs(V)>.25f) C->TakeOver();
    return !C->Walking;
}
void AWalkCharacter::Forward(float V) { if(Touring(Controller,V,true))return; AddMovementInput(FRotationMatrix(FRotator(0,GetControlRotation().Yaw,0)).GetUnitAxis(EAxis::X),V); }
void AWalkCharacter::Right(float V) { if(Touring(Controller,V,true))return; AddMovementInput(FRotationMatrix(FRotator(0,GetControlRotation().Yaw,0)).GetUnitAxis(EAxis::Y),V); }
void AWalkCharacter::LookX(float V) { if(Touring(Controller,V,false))return; if(auto* C=Cast<AWalkController>(Controller)) AddControllerYawInput(V*C->Save->Sensitivity*2.0f); }
// Default vertical look: pushing the mouse or right stick up looks down. InvertY flips it.
void AWalkCharacter::LookY(float V) { if(Touring(Controller,V,false))return; if(auto* C=Cast<AWalkController>(Controller)) AddControllerPitchInput(V*C->Save->Sensitivity*(C->Save->InvertY?2.f:-2.f)); }
void AWalkCharacter::StickX(float V) { if(Touring(Controller,V,true))return; if(auto* C=Cast<AWalkController>(Controller)) AddControllerYawInput(V*GetWorld()->GetDeltaSeconds()*90*C->Save->Sensitivity); }
void AWalkCharacter::StickY(float V) { if(Touring(Controller,V,true))return; if(auto* C=Cast<AWalkController>(Controller)) AddControllerPitchInput(V*GetWorld()->GetDeltaSeconds()*70*C->Save->Sensitivity*(C->Save->InvertY?1:-1)); }
void AWalkCharacter::Brisk(){GetCharacterMovement()->MaxWalkSpeed=300;}
void AWalkCharacter::Slow(){GetCharacterMovement()->MaxWalkSpeed=180;}

FString AWalkController::Slot() const { return Smoke?TEXT("QuietWalkSmoke"):TEXT("QuietWalk"); }
void AWalkController::BeginPlay() {
    Super::BeginPlay(); bShouldPerformFullTickWhenPaused=true; PrimaryActorTick.bTickEvenWhenPaused=true; BeginTime=FPlatformTime::Seconds();
    ResumeSmoke=FParse::Param(FCommandLine::Get(),TEXT("WalkSmokeResume"));
    Smoke=ResumeSmoke||FParse::Param(FCommandLine::Get(),TEXT("WalkSmoke"));
    Save=(Smoke&&!ResumeSmoke)?nullptr:Cast<UWalkSave>(UGameplayStatics::LoadGameFromSlot(Slot(),0));
    if(!Save||Save->Version!=1) Save=Cast<UWalkSave>(UGameplayStatics::CreateSaveGameObject(UWalkSave::StaticClass()));
    UpgradeSave(Save);
    Save->Sensitivity=FMath::Clamp(Save->Sensitivity,.5f,2.f); Save->Fov=FMath::Clamp(Save->Fov,70.f,100.f); Save->Volume=FMath::Clamp(Save->Volume,0.f,1.f); Save->Quality=FMath::Clamp(Save->Quality,0,3);
    // Feet positions come from the authored web viewpoints, in centimetres (x,z,y).
    Places={
        {"house",TEXT("The house entrance"),TEXT("Two raised sitting platforms flank the entrance. Notice the timber supports, red floor and the lower passage between them."),FVector(-380,-200,0),90},
        {"courtyard",TEXT("The inner courtyard"),TEXT("The roof opens to the sky. Look for the Tulsi and the covered passages around this smaller, quieter court."),FVector(-720,685,3.5),90},
        {"temple",TEXT("The temple entrance"),TEXT("The lane opens toward the temple. Look up at the layered roof before going through the entrance."),FVector(4230,-650,5.1),125},
        {"court",TEXT("The temple courtyard"),TEXT("Follow the covered edge of the courtyard. Columns, changing floor levels and the Tulsi organize the open space."),FVector(3000,1400,10),15},
        {"rear",TEXT("The rear veranda"),TEXT("At the far end of the circuit, the upper screened room and small dome sit above the ground-floor bays."),FVector(3150,3200,10),90},
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
           .Visibility_Lambda([this](){return Page.IsEmpty()&&Walking&&Save->Guidance?EVisibility::HitTestInvisible:EVisibility::Collapsed;})
           [SNew(STextBlock).Text_Lambda([this](){return Txt(Status());}).Font(FCoreStyle::GetDefaultFontStyle("Regular",16)).ColorAndOpacity(Cream)]]
        + SOverlay::Slot().HAlign(HAlign_Center).VAlign(VAlign_Bottom).Padding(24,28)
          [SNew(STextBlock).Text_Lambda([this](){return Txt(Prompt());}).Font(FCoreStyle::GetDefaultFontStyle("Regular",18)).ColorAndOpacity(Cream).ShadowOffset(FVector2D(1,1)).ShadowColorAndOpacity(FLinearColor::Black)];
    GEngine->GameViewport->AddViewportWidgetContent(Hud.ToSharedRef(),1); Hud->SetVisibility(EVisibility::HitTestInvisible);
    TitleCamera=GetWorld()->SpawnActor<ACameraActor>(FVector(-700,-3700,300),FRotator(-3,35,0));
    if(TitleCamera)TitleCamera->GetCameraComponent()->SetFieldOfView(75);
    Travel(0);
    // Like the web app: open straight into the guided tour; Esc / Menu brings up the menu.
    if(LoadTour()){TourShownAt=FPlatformTime::Seconds();TickTour(0);Show("");}else{UE_LOG(LogTemp,Warning,TEXT("QUIETWALK tour missing: Content/Tour/tour.json"));Show("home");}
    UE_LOG(LogTemp,Display,TEXT("QUIETWALK ready: guided tour, native menus, walking, journal and saves"));
}
void AWalkController::EndPlay(const EEndPlayReason::Type R) {
    if(Save&&Walking&&!Smoke) Persist(true);
    if(GEngine&&GEngine->GameViewport) {if(Menu)GEngine->GameViewport->RemoveViewportWidgetContent(Menu.ToSharedRef()); if(Hud)GEngine->GameViewport->RemoveViewportWidgetContent(Hud.ToSharedRef());}
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
    int32 FocusIndex=0;
    if(Menu&&Page==P)for(int32 I=0;I<Menu->Buttons.Num();I++)if(Menu->Buttons[I]->HasKeyboardFocus())FocusIndex=I;
    if(Menu) { GEngine->GameViewport->RemoveViewportWidgetContent(Menu.ToSharedRef()); Menu.Reset(); }
    Page=P; bool Open=!P.IsEmpty(); SetPause(Open&&(Walking||TourPosition.Num()>1)); bShowMouseCursor=Open;
    if(!Walking&&TitleCamera)SetViewTarget(TitleCamera);else if(GetPawn())SetViewTarget(GetPawn());
    ResetIgnoreMoveInput();ResetIgnoreLookInput();SetIgnoreMoveInput(Open);SetIgnoreLookInput(Open);
    FocusAt=FPlatformTime::Seconds()+.3;PendingFocus=FocusIndex;
    if(auto* C=Cast<AWalkCharacter>(GetPawn())) {C->Slow();C->GetCharacterMovement()->StopMovementImmediately();}
    FlushPressedKeys();
    if(Open) { Menu=SNew(SQuietMenu).Owner(this); GEngine->GameViewport->AddViewportWidgetContent(Menu.ToSharedRef(),10); FInputModeUIOnly M; M.SetWidgetToFocus(Menu); M.SetLockMouseToViewportBehavior(EMouseLockMode::DoNotLock); SetInputMode(M); Menu->Focus(FocusIndex); }
    else {SetInputMode(FInputModeGameOnly()); FSlateApplication::Get().SetAllUserFocusToGameViewport();}
}
void AWalkController::Back(){if(Page=="home"){if(!Walking&&TourPosition.Num()>1)Show("");return;}if(Page=="pause")Show("");else if(Page.StartsWith("place:"))Show("journal");else Show(Walking?"pause":"home");}
void AWalkController::PauseWalk(){if(Walking){if(Page.IsEmpty())Show("pause");else Back();}else if(Page.IsEmpty())Show("home");else Back();}
void AWalkController::OpenJournal(){if(Walking)Show("journal");}
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
    if(!Continue){Save->Visited.Empty();if(!Travel(0)){Notify(TEXT("Entrance unavailable. Please reload the walk."));return;}}
    else if(!RestorePosition(Save->Position,Save->Look)){Travel(0);Notify(TEXT("Returned to the entrance; your journal is safe."));}
    Walking=true;Save->HasWalk=true;Show("");Persist(true);Notify(TEXT("WASD / left stick to walk · Look around · Esc / Menu to pause"));
}
bool AWalkController::Persist(bool Capture) {
    auto* C=Cast<AWalkCharacter>(GetPawn());
    if(Capture&&C&&Walking&&C->GetCharacterMovement()->IsMovingOnGround()){Save->Position=C->GetActorLocation();Save->Look=GetControlRotation();}
    bool Ok=UGameplayStatics::SaveGameToSlot(Save,Slot(),0);if(!Ok)Notify(TEXT("Could not save your walk. Check available disk space."));return Ok;
}
void AWalkController::ApplySettings() {
    if(auto* C=Cast<AWalkCharacter>(GetPawn())) C->Camera->SetFieldOfView(Save->Fov);
    auto* G=UGameUserSettings::GetGameUserSettings();G->SetOverallScalabilityLevel(Save->Quality);G->SetFrameRateLimit(60);G->SetVSyncEnabled(true);
    G->SetFullscreenMode(Save->Fullscreen?EWindowMode::WindowedFullscreen:EWindowMode::Windowed);G->ApplySettings(false);
    if(auto* V=IConsoleManager::Get().FindConsoleVariable(TEXT("r.MotionBlurQuality")))V->Set(0,ECVF_SetByGameSetting);
    if(Ambience)Ambience->SetVolumeMultiplier(Save->Volume);
}
void AWalkController::Observe() {
    if(!Walking||!Page.IsEmpty()||!Places.IsValidIndex(Nearby))return;
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
    else if(Id=="title"){if(Persist(true)){Walking=false;Travel(0);Show("home");}}
    else if(Id=="quit"){if(Persist(Walking))UKismetSystemLibrary::QuitGame(this,this,EQuitPreference::Quit,false);}
    else if(Id=="rescue"&&Walking){if(Travel(0)){Show("");Persist(true);Notify(TEXT("Back at the house entrance."));}else Notify(TEXT("Could not find safe ground at the entrance."));}
    else if(Id.StartsWith("travel:")&&Walking){int32 I=FCString::Atoi(*Id.Mid(7));if(Places.IsValidIndex(I)&&Save->Visited.Contains(Places[I].Id)){if(Travel(I)){Show("");Persist(true);}else Notify(TEXT("This landing is blocked. Your position is unchanged."));}}
    else if(Page=="settings") {
        if(Id=="sensitivity") Save->Sensitivity=Save->Sensitivity>=2?.5f:Save->Sensitivity+.25f;
        else if(Id=="fov") Save->Fov=Save->Fov>=100?70:Save->Fov+5;
        else if(Id=="volume") Save->Volume=Save->Volume>=.99f?0:FMath::Min(1.f,Save->Volume+.25f);
        else if(Id=="invert") Save->InvertY=!Save->InvertY;
        else if(Id=="guidance") Save->Guidance=!Save->Guidance;
        else if(Id=="quality") Save->Quality=(Save->Quality+1)%4;
        else if(Id=="display") Save->Fullscreen=!Save->Fullscreen;
        else if(Id=="defaults"){Save->Sensitivity=1;Save->Fov=85;Save->Volume=.5;Save->InvertY=false;Save->Guidance=true;Save->Quality=2;Save->Fullscreen=false;}
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
    if(!InitialViewReady&&GetPawn()){InitialViewReady=Travel(0);ApplySettings();}
    if(Menu&&FocusAt>0&&FPlatformTime::Seconds()>=FocusAt){Menu->Focus(PendingFocus);FocusAt=0;}
    if(Smoke)SmokeTick();
    if(!Walking){if(Page.IsEmpty())TickTour(D);return;}
    if(!Page.IsEmpty())return;
    if(!Smoke&&!FSlateApplication::Get().IsActive()){Show("pause");return;}
    auto* C=Cast<AWalkCharacter>(GetPawn());if(!C)return;
    if(Smoke&&SmokeMoving)C->Forward(1);
    Nearby=INDEX_NONE;float Best=280*280;
    for(int32 I=0;I<Places.Num();I++){FVector Delta=Places[I].Feet+FVector(0,0,88)-C->GetActorLocation();if(FMath::Abs(Delta.Z)<120&&Delta.SizeSquared2D()<Best){FHitResult Hit;FCollisionQueryParams P;P.AddIgnoredActor(C);if(!GetWorld()->LineTraceSingleByChannel(Hit,C->Camera->GetComponentLocation(),Places[I].Feet+FVector(0,0,150),ECC_Visibility,P)){Nearby=I;Best=Delta.SizeSquared2D();}}}
    if(C->GetActorLocation().Z<-850||C->GetActorLocation().Size2D()>16000){Travel(0);Notify(TEXT("Back on the path. Your journal is safe."));}
    SaveTimer+=D;if(SaveTimer>20){Persist(true);SaveTimer=0;}
    if(C->GetCharacterMovement()->IsMovingOnGround()&&C->GetVelocity().Size2D()>40){FootstepTimer+=D;if(FootstepTimer> (C->GetVelocity().Size2D()>210?.43f:.65f)){FootstepTimer=0; if(auto* Sound=LoadObject<USoundWave>(nullptr,TEXT("/Game/WalkAudio/Footstep.Footstep")))UGameplayStatics::PlaySound2D(this,Sound,Save->Volume*.3f,FMath::FRandRange(.92f,1.08f));}}else FootstepTimer=.3f;
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

void AWalkController::SmokeTick() {
    // Runs only with -WalkSmoke, on a separate save slot. Real scene, collision and UI.
    double Now=FPlatformTime::Seconds();if(Now<BeginTime+8||Now<NextSmoke)return;NextSmoke=Now+1.5;
    auto Check=[this](bool Ok,const FString& What){UE_LOG(LogTemp,Display,TEXT("WALKTEST %s %s"),Ok?TEXT("PASS"):TEXT("FAIL"),*What);if(!Ok)SmokeFailures.Add(What);};
    const FString Dir=FPaths::ProjectSavedDir()/TEXT("WalkReview");IFileManager::Get().MakeDirectory(*Dir,true);
    auto Press=[](const FKey& K,bool Down=true,bool Up=true){
        if(Down)FSlateApplication::Get().ProcessKeyDownEvent(FKeyEvent(K,FModifierKeysState(),0,false,0,0));
        if(Up)FSlateApplication::Get().ProcessKeyUpEvent(FKeyEvent(K,FModifierKeysState(),0,false,0,0));};
    if(ResumeSmoke){
        if(SmokeStep++==0){Check(Save->HasWalk&&Save->Visited.Num()==Places.Num(),TEXT("cold restart loads the completed journal"));SmokePosition=Save->Position;StartWalk(true);return;}
        Check(Walking&&Page.IsEmpty()&&FVector::Dist(GetPawn()->GetActorLocation(),SmokePosition)<5,TEXT("cold restart restores saved position"));
        FFileHelper::SaveStringToFile(SmokeFailures.IsEmpty()?TEXT("{\"passed\":true}"):TEXT("{\"passed\":false}"),*(Dir/TEXT("resume-smoke.json")));
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
        Check(IConsoleManager::Get().FindConsoleVariable(TEXT("r.RayTracing.ResidentGeometryMemoryPoolSizeInMB"))->GetInt()==1024,TEXT("ray-tracing geometry pool configured for this scene"));
        Check(TourPosition.Num()>1000&&TourPeriod>1000&&TourLoopStart>0,TEXT("guided tour loaded: opening flight, then a loop"));
        Check(!Walking&&Page.IsEmpty()&&!Menu.IsValid()&&!bShowMouseCursor&&!IsPaused()&&GetViewTarget()==TitleCamera,TEXT("tour starts on launch without a menu"));
        Check(TourTime>3&&TitleCamera&&FVector::Dist(TitleCamera->GetActorLocation(),TourPosition[0])>100,TEXT("tour camera moves along the path"));
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
    case 8:Action("settings");Action("fov");Action("invert");Check(Save->Fov==90&&Save->InvertY,TEXT("comfort settings change"));FScreenshotRequest::RequestScreenshot(Dir/TEXT("04-settings.png"),true,false);break;
    case 9:{auto* Reload=Cast<UWalkSave>(UGameplayStatics::LoadGameFromSlot(Slot(),0));Check(Reload&&Reload->Fov==90&&Reload->Visited.Contains("house"),TEXT("settings and journal persist"));Action("defaults");Action("back");Action("title");Action("new");Check(Page=="new-confirm",TEXT("new walk protects existing save"));Action("back");Action("continue");break;}
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
        if(I==Places.Num()+3){Check(FVector::Dist(SmokePosition,GetPawn()->GetActorLocation())<.5,TEXT("pause keeps physical position fixed"));Action("rescue");Check(FVector::Dist2D(GetPawn()->GetActorLocation(),Places[0].Feet)<100,TEXT("return to entrance recovery"));return;}
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
            Check(!Old->InvertY&&Old->LookVersion==1&&Current->InvertY,TEXT("older saves get the new look default once; later choices stay"));return;
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
        Check(Persist(true),TEXT("final save succeeds"));
        TSharedRef<FJsonObject> Report=MakeShared<FJsonObject>();Report->SetBoolField("passed",SmokeFailures.IsEmpty());TArray<TSharedPtr<FJsonValue>> Errors;for(auto& E:SmokeFailures)Errors.Add(MakeShared<FJsonValueString>(E));Report->SetArrayField("failures",Errors);
        FString Json;auto Writer=TJsonWriterFactory<>::Create(&Json);FJsonSerializer::Serialize(Report,Writer);FFileHelper::SaveStringToFile(Json,*(Dir/TEXT("smoke.json")));
        NextSmoke=TNumericLimits<double>::Max();
        UKismetSystemLibrary::QuitGame(this,this,EQuitPreference::Quit,false);break;
    }}
}
