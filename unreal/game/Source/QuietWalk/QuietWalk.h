#pragma once
#include "CoreMinimal.h"
#include "GameFramework/Character.h"
#include "GameFramework/PlayerController.h"
#include "GameFramework/GameModeBase.h"
#include "GameFramework/SaveGame.h"
#include "QuietWalk.generated.h"

class UCameraComponent;
class UAudioComponent;
class SWidget;
class SQuietMenu;
class ACameraActor;
class UTexture2D;
class FJsonObject;
class FJsonValue;
struct FSlateBrush;

UCLASS()
class QUIETWALK_API UWalkSave : public USaveGame {
    GENERATED_BODY()
public:
    UPROPERTY() int32 Version = 1;
    // Saves store only non-default fields, so an older save loads this as 0. At 1 the
    // vertical-look default is flipped (push up looks down); older saves reset InvertY once.
    UPROPERTY() int32 LookVersion = 0;
    UPROPERTY() bool HasWalk = false;
    UPROPERTY() FVector Position = FVector(-380, -200, 92);
    UPROPERTY() FRotator Look = FRotator(0, 90, 0);
    UPROPERTY() TArray<FString> Visited;
    UPROPERTY() float Sensitivity = 1;
    UPROPERTY() float Fov = 85;
    UPROPERTY() float Volume = .5f;
    UPROPERTY() bool InvertY = false;
    UPROPERTY() bool Guidance = true;
    UPROPERTY() int32 Quality = 2;
    UPROPERTY() bool Fullscreen = false;
    // Legacy walks import their existing engine display preferences once. Quality
    // and render scale are independent; changing one must not reset the other.
    UPROPERTY() int32 DisplayVersion = 0;
    UPROPERTY() FIntPoint WindowResolution = FIntPoint(1600, 900);
    UPROPERTY() float RenderScale = 100;
};

UCLASS()
class QUIETWALK_API AWalkCharacter : public ACharacter {
    GENERATED_BODY()
public:
    AWalkCharacter();
    virtual void SetupPlayerInputComponent(UInputComponent* Input) override;
    UPROPERTY() TObjectPtr<UCameraComponent> Camera;
    void Forward(float Value);
    void Right(float Value);
    void LookX(float Value);
    void LookY(float Value);
    void StickX(float Value);
    void StickY(float Value);
    void Brisk();
    void Slow();
};

struct FWalkPlace {
    FString Id, Title, Note;
    FVector Feet;
    float Yaw;
};

struct FWalkWaterRegion {
    FString Id;
    FBox Bounds;
};

UCLASS()
class QUIETWALK_API AWalkController : public APlayerController {
    GENERATED_BODY()
public:
    virtual void BeginPlay() override;
    virtual void EndPlay(const EEndPlayReason::Type Reason) override;
    virtual void SetupInputComponent() override;
    virtual void PlayerTick(float Delta) override;
    UPROPERTY() TObjectPtr<UWalkSave> Save;
    UPROPERTY() TObjectPtr<UAudioComponent> Ambience;
    UPROPERTY() TObjectPtr<ACameraActor> TitleCamera;
    TArray<FWalkPlace> Places;
    FString Page = TEXT("home");
    bool Walking = false;
    // Guided tour, from blender/build/unreal/tour.json (staged as Content/Tour/tour.json).
    // Plays whenever the walk is not active and no menu is open.
    TArray<FVector> TourPosition;
    TArray<FQuat> TourRotation;
    TArray<TPair<int32,FString>> TourMarkers;
    float TourFps = 24, TourFov = 58;
    int32 TourLoopStart = 0, TourPeriod = 0;
    double TourTime = 0;
    double TourShownAt = 0;
    bool LoadTour();
    void TickTour(float Delta);
    void StartTour();
    void TakeOver();
    FString TourLabel() const;
    int32 Nearby = INDEX_NONE;
    FString Toast;
    double ToastUntil = 0;
    TSharedPtr<SQuietMenu> Menu;
    TSharedPtr<SWidget> Hud;
    void Show(const FString& NewPage);
    void Back();
    void PauseWalk();
    void OpenJournal();
    void Observe();
    void StartWalk(bool Continue);
    bool Travel(int32 Index);
    bool RestorePosition(FVector Position, FRotator Look);
    bool Persist(bool CapturePosition);
    // Input remains blocked after water recovery until both movement axes settle
    // at neutral. Look and menus remain available throughout recovery.
    bool AllowWaterMovement(float Value, bool RightAxis);
    void ApplySettings();
    FString DisplayStatus() const;
    TSharedRef<FJsonObject> DisplayReport() const;
    FString Status() const;
    FString Prompt() const;
    void Action(const FString& Id);
    void Notify(const FString& Text);
    FString Slot() const;
    UFUNCTION(Exec) void WalkAction(const FString& Id);
    // Photo alignment (start and pause menus): browse the private photo folder, fly to a photo's
    // saved pose, compare the view with the photo and save a new alignment or a note. Poses are
    // read from and written to the web align tool's align-poses.json, so both tools share them.
    FString PhotoDir;
    TArray<FString> PhotoFiles;
    TSharedPtr<FJsonObject> PoseRoot, NotesRoot;
    UPROPERTY() TObjectPtr<UTexture2D> PhotoTexture;
    UPROPERTY() TObjectPtr<ACameraActor> AlignCamera;
    TSharedPtr<FSlateBrush> PhotoBrush;
    TSharedPtr<SWidget> AlignHud;
    int32 PhotoIndex = 0, PhotoPage = 0;
    bool Aligning = false, AlignOverlay = false;
    float AlignVFov = 48, AlignAspect = 4.f/3;
    FVector2D AlignMove = FVector2D::ZeroVector;
    FString NoteDraft;
    static constexpr int32 PhotosPerPage = 9;
    FString PhotoName() const { return PhotoFiles.IsValidIndex(PhotoIndex)?PhotoFiles[PhotoIndex]:FString(); }
    bool LoadPoses();
    TSharedPtr<FJsonObject> PoseFor(const FString& File) const;
    FString NotesPath() const;
    FString PhotoNote(const FString& File) const;
    bool SavePose(const FString& File,bool Camera,const FString* Notes);
    bool SaveLooseNote(const FString& Text,const FString& Photo);
    bool OpenPhoto(int32 Index);
    void StartAlign(bool FromSaved);
    void StopAlign();
    // While aligning, without the menu: the saved lens (and, with Move, eye and rotation) of the
    // open photograph; fly to it; step to the previous / next photograph, wrapping round.
    bool SavedView(bool Move,FVector& Eye,FQuat& Rotation);
    bool AlignToSaved();
    bool AlignStep(int32 Direction);
    void TickAlign(float Delta);
    void AlignTurn(float Yaw,float Pitch);
    void ApplyAlignLens();
    void ThreeCamera(TArray<double>& Position,TArray<double>& Quaternion,TArray<double>& Direction) const;
private:
    float SaveTimer = 0;
    float FootstepTimer = 0;
    TArray<FWalkWaterRegion> WaterRegions;
    bool WaterDataReady = false, WaterHasSafeGround = false, WaterHasCandidateGround = false, WaterHasVerifiedGround = false;
    bool WaterMovementLatched = false;
    bool WaterAnchorEntryClear = false, WaterAnchorRestingGroundSafe = false;
    float WaterForwardAxis = 0, WaterRightAxis = 0;
    FVector WaterSafePosition = FVector::ZeroVector, WaterCandidatePosition = FVector::ZeroVector, WaterVerifiedGroundPosition = FVector::ZeroVector;
    int32 WaterRecoveryCount = 0;
    FString WaterLastRecoveryId;
    TArray<TSharedPtr<FJsonValue>> WaterRecoveryEvents;
    bool LoadWaterRegions();
    FString WaterHazardAt(const FVector& Center) const;
    bool WaterSafeGround(const FVector& Center, bool Diagnostics = false) const;
    bool WaterCapsuleClear(const FVector& Center, const FRotator& Look, bool Diagnostics = false) const;
    void ResetWaterAnchor(const FVector& Center);
    bool RestoreWaterAnchor(const FVector& Center, const FRotator& Look);
    void TickWaterSafety();
    bool RecoverFromWater(const FString& Region, const FString& Reason);
    double BeginTime = 0;
    bool Smoke = false;
    bool ResumeSmoke = false;
    int32 SmokeStep = 0;
    double NextSmoke = 0;
    TArray<FString> SmokeFailures;
    bool InitialViewReady = false;
    // Read-only collision characterization on two short water-edge routes. Use
    // -WalkWaterProbe with an isolated -UserDir; it never writes a walk save.
    bool WaterProbe = false, WaterProbeMoving = false, WaterProbeFinished = false;
    float WaterProbeInput = 1.f;
    int32 WaterProbeStage = 0;
    double WaterProbeStart = 0, WaterProbeSampleAt = 0;
    TSharedPtr<FJsonObject> WaterProbeReport, WaterProbeRoute;
    void WaterProbeTick();
    void WaterProbeSample(const FString& Phase);
    void FinishWaterProbe(const FString& Error = FString());
    // Two-process save/Continue check on legitimate dry ground that movement
    // accepts but exact native teleport clearance rejects. Isolated UserDir only.
    bool ContinueProbe = false, ContinueProbeResume = false, ContinueProbeFinished = false;
    int32 ContinueProbeStep = 0;
    FVector ContinueProbeExpectedPosition = FVector::ZeroVector;
    UPROPERTY() TObjectPtr<UWalkSave> ContinueProbeBaseline;
    void ContinueProbeTick();
    double FocusAt = 0;
    int32 PendingFocus = 0;
    bool SmokeMoving = false;
    float SmokeForwardInput = 1.f;
    FVector SmokePosition;
    double SmokeTourTime = 0;
    double DisplayLogAt = 0;
    int32 SmokeSettingsStep = 0;
    int32 SmokeDisplayStep = 0;
    FIntPoint SmokeWindowResolution = FIntPoint::ZeroValue;
    TSharedPtr<FJsonObject> SmokeDisplayReport;
    int32 SmokeTempleStairStep = 0;
    double SmokeTempleWalkAt = 0, SmokeTempleDeadline = 0;
    int32 SmokeWaterStep = 0, SmokeWaterRecoveryBase = 0;
    double SmokeWaterSimAt = 0, SmokeWaterDeadline = 0;
    FVector SmokeWaterStart = FVector::ZeroVector, SmokeWaterRecovered = FVector::ZeroVector;
    UPROPERTY() TObjectPtr<UWalkSave> SmokeWaterBaseline;
    int32 SmokeRoadLeg = 0, SmokeRoadPhase = 0, SmokeRoadRecoveryBase = 0, SmokeRoadSupportSamples = 0;
    bool SmokeRoadActive = false, SmokeRoadContinuousSupport = true;
    double SmokeRoadSimAt = 0, SmokeRoadDeadline = 0, SmokeRoadTargetY = 0, SmokeRoadTrackX = 0;
    double SmokeRoadMaxLateral = 0, SmokeRoadMinSupportZ = 0, SmokeRoadMaxSupportZ = 0;
    FVector SmokeRoadStart = FVector::ZeroVector, SmokeRoadSavedPosition = FVector::ZeroVector, SmokeRoadSupportPoint = FVector::ZeroVector;
    FRotator SmokeRoadSavedLook = FRotator::ZeroRotator;
    FString SmokeRoadSupportIssue, SmokeRoadSupportMesh;
    UPROPERTY() TObjectPtr<UWalkSave> SmokeRoadBaseline;
    TArray<TSharedPtr<FJsonValue>> SmokeRoadReports;
    void ObserveRoadSmoke();
    void SmokeTick();
    // -WalkReviewPhoto=<part of a file name>: open that photograph at its saved pose, capture the
    // photo page, the side-by-side view and the overlay into Saved/WalkReview, then quit. Saves nothing.
    FString ReviewPhoto;
    int32 ReviewStep = 0;
    double NextReview = 0;
    void ReviewTick();
};

UCLASS()
class QUIETWALK_API AWalkGameMode : public AGameModeBase {
    GENERATED_BODY()
public:
    AWalkGameMode();
};
