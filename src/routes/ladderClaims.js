import express from 'express';
import LadderPositionClaim from '../models/LadderPositionClaim.js';

const router = express.Router();

// Get all ladder position claims
router.get('/claims', async (req, res) => {
  try {
    const claims = await LadderPositionClaim.find({})
      .sort({ createdAt: -1 })
      .limit(100);

    res.json({
      success: true,
      claims: claims
    });
  } catch (error) {
    console.error('Error fetching ladder claims:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch ladder claims'
    });
  }
});

// Get claims by status
router.get('/claims/status/:status', async (req, res) => {
  try {
    const { status } = req.params;
    const claims = await LadderPositionClaim.find({ status })
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      claims: claims
    });
  } catch (error) {
    console.error('Error fetching claims by status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch claims by status'
    });
  }
});

// Get claims for a specific ladder position
router.get('/claims/position/:ladderName/:position', async (req, res) => {
  try {
    const { ladderName, position } = req.params;
    const claims = await LadderPositionClaim.find({
      ladderName,
      position: parseInt(position)
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      claims: claims
    });
  } catch (error) {
    console.error('Error fetching claims for position:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch claims for position'
    });
  }
});

// Approve a claim
router.post('/claims/:claimId/approve', async (req, res) => {
  try {
    const { claimId } = req.params;
    const { approvedBy, notes } = req.body;

    const claim = await LadderPositionClaim.findById(claimId);
    if (!claim) {
      return res.status(404).json({
        success: false,
        message: 'Claim not found'
      });
    }

    claim.status = 'approved';
    claim.approvedBy = approvedBy || 'admin';
    claim.approvedAt = new Date();
    if (notes) {
      claim.claimData.message = notes;
    }

    await claim.save();

    res.json({
      success: true,
      message: 'Claim approved successfully',
      claim: claim
    });
  } catch (error) {
    console.error('Error approving claim:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to approve claim'
    });
  }
});

// Reject a claim
router.post('/claims/:claimId/reject', async (req, res) => {
  try {
    const { claimId } = req.params;
    const { rejectedBy, reason } = req.body;

    const claim = await LadderPositionClaim.findById(claimId);
    if (!claim) {
      return res.status(404).json({
        success: false,
        message: 'Claim not found'
      });
    }

    claim.status = 'rejected';
    claim.rejectionReason = reason || 'Claim rejected by admin';
    claim.updatedAt = new Date();

    await claim.save();

    res.json({
      success: true,
      message: 'Claim rejected successfully',
      claim: claim
    });
  } catch (error) {
    console.error('Error rejecting claim:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reject claim'
    });
  }
});

// Complete a claim (mark as completed after processing)
router.post('/claims/:claimId/complete', async (req, res) => {
  try {
    const { claimId } = req.params;
    const { completedBy } = req.body;

    const claim = await LadderPositionClaim.findById(claimId);
    if (!claim) {
      return res.status(404).json({
        success: false,
        message: 'Claim not found'
      });
    }

    claim.status = 'completed';
    claim.approvedBy = completedBy || 'admin';
    claim.approvedAt = new Date();

    await claim.save();

    res.json({
      success: true,
      message: 'Claim marked as completed',
      claim: claim
    });
  } catch (error) {
    console.error('Error completing claim:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to complete claim'
    });
  }
});

// Get claim statistics
router.get('/claims/stats', async (req, res) => {
  try {
    const stats = await LadderPositionClaim.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const totalClaims = await LadderPositionClaim.countDocuments();
    const recentClaims = await LadderPositionClaim.countDocuments({
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
    });

    res.json({
      success: true,
      stats: {
        total: totalClaims,
        recent: recentClaims,
        byStatus: stats
      }
    });
  } catch (error) {
    console.error('Error fetching claim stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch claim statistics'
    });
  }
});

export default router;
