import express, { type Request, type Response } from 'express';

const router = express.Router();

const canvasProjects: Record<string, { id: string; name: string; elements: unknown[]; createdAt: string; updatedAt: string }> = {};

router.post('/project', async (req: Request, res: Response) => {
  const { name, elements } = req.body;
  
  try {
    const id = `proj-${Date.now()}`;
    const now = new Date().toISOString();
    
    canvasProjects[id] = {
      id,
      name,
      elements: elements || [],
      createdAt: now,
      updatedAt: now,
    };
    
    res.status(200).json({
      success: true,
      id,
      name,
    });
  } catch {
    res.status(500).json({
      success: false,
      error: 'Failed to create canvas project',
    });
  }
});

router.get('/project/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  
  try {
    const project = canvasProjects[id];
    
    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found',
      });
    }
    
    res.status(200).json({
      success: true,
      ...project,
    });
  } catch {
    res.status(500).json({
      success: false,
      error: 'Failed to get canvas project',
    });
  }
});

router.put('/project/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { elements } = req.body;
  
  try {
    const project = canvasProjects[id];
    
    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found',
      });
    }
    
    project.elements = elements;
    project.updatedAt = new Date().toISOString();
    
    res.status(200).json({
      success: true,
      id,
      elements,
    });
  } catch {
    res.status(500).json({
      success: false,
      error: 'Failed to update canvas project',
    });
  }
});

router.delete('/project/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  
  try {
    if (!canvasProjects[id]) {
      return res.status(404).json({
        success: false,
        error: 'Project not found',
      });
    }
    
    delete canvasProjects[id];
    
    res.status(200).json({
      success: true,
      message: 'Project deleted',
    });
  } catch {
    res.status(500).json({
      success: false,
      error: 'Failed to delete canvas project',
    });
  }
});

export default router;
