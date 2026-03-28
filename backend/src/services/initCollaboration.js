const { CollaborationService } = require('./collaborationService');

let collaborationService = null;

function initCollaborationService(server) {
  if (!collaborationService) {
    collaborationService = new CollaborationService(server);
    console.log('✅ Collaboration Service initialized');
  }
  return collaborationService;
}

function getCollaborationService() {
  return collaborationService;
}

module.exports = {
  initCollaborationService,
  getCollaborationService
};
