import express from 'express';
import * as leagueConfigController from '../controllers/leagueConfigController.js';

const router = express.Router();

// League configuration routes
router.get('/', leagueConfigController.getLeagueConfig);
router.put('/', leagueConfigController.updateLeagueConfig);

// Google Sheets backup routes
router.post('/backup/configure', leagueConfigController.configureGoogleSheetsBackup);
router.post('/backup/test-connection', leagueConfigController.testBackupConnection);
router.post('/backup/create-sheet', leagueConfigController.createBackupSheet);
router.post('/backup/run', leagueConfigController.runManualBackup);
router.get('/backup/status', leagueConfigController.getBackupStatus);

export default router;
