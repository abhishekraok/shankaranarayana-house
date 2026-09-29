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
    void ApplySettings();
    FString Status() const;
    FString Prompt() const;
    void Action(const FString& Id);
    void Notify(const FString& Text);
    FString Slot() const;
    UFUNCTION(Exec) void WalkAction(const FString& Id);
private:
    float SaveTimer = 0;
    float FootstepTimer = 0;
    double BeginTime = 0;
    bool Smoke = false;
    bool ResumeSmoke = false;
    int32 SmokeStep = 0;
    double NextSmoke = 0;
    TArray<FString> SmokeFailures;
    bool InitialViewReady = false;
    double FocusAt = 0;
    int32 PendingFocus = 0;
    bool SmokeMoving = false;
    FVector SmokePosition;
    double SmokeTourTime = 0;
    void SmokeTick();
};

UCLASS()
class QUIETWALK_API AWalkGameMode : public AGameModeBase {
    GENERATED_BODY()
public:
    AWalkGameMode();
};
