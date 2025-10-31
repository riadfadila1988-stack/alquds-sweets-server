import { Request, Response } from 'express';
import MaterialService from './material.service';

class MaterialController {
    async getAllMaterials(req: Request, res: Response) {
        try {
            const materials = await MaterialService.getAllMaterials();
            res.status(200).json(materials);
        } catch (error: any) {
            res.status(500).json({ message: error.message });
        }
    }

    async createMaterial(req: Request, res: Response) {
        try {
            const material = await MaterialService.createMaterial(req.body);
            res.status(201).json(material);
        } catch (error: any) {
            res.status(500).json({ message: error.message });
        }
    }

    async updateMaterial(req: Request, res: Response) {
        try {
            const material = await MaterialService.updateMaterial(req.params.id, req.body);
            res.status(200).json(material);
        } catch (error: any) {
            res.status(500).json({ message: error.message });
        }
    }

    async updateMaterialQuantity(req: Request, res: Response) {
        try {
            const { quantity } = req.body;
            const material = await MaterialService.updateMaterialQuantity(req.params.id, { quantity });
            if (!material) return res.status(404).json({ message: 'Material not found' });
            res.status(200).json(material);
        } catch (error: any) {
            res.status(500).json({ message: error.message });
        }
    }

    async deleteMaterial(req: Request, res: Response) {
        try {
            await MaterialService.deleteMaterial(req.params.id);
            res.status(204).send();
        } catch (error: any) {
            res.status(500).json({ message: error.message });
        }
    }
}

export default new MaterialController();
