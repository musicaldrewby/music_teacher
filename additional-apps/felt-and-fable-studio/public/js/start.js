initCameraUI();
initOffstage();
initAnimationBlocks();
FeltWelcome.connect();
const recoveryStartup=FeltRecovery.init();
window.feltStartup=boot().then(async()=>{
 if(ready){initStudioWorkspaces();FeltCinema.init();FeltDirector.init();FeltTalkUI.init();directorAgentInit();performanceInitUI();movieFXInit();FeltSelection.init();storyToolsInit();FeltStudio.init();FeltWardrobe.init();FeltExamples.init();FeltPerformances.init();FeltConversation.init();FeltProduction.init();craftInit();await recoveryStartup;FeltWelcome.ready();FeltPhrases.init();classroomInit();deskInit();rigInitUI();cineInit();FeltAmbient.init();FeltExamples.openRequested()}else FeltWelcome.failed();
}).catch(error=>{console.error(error);FeltWelcome.failed()});
