import { Request, Response } from "express";
import { ProfileService } from "../services/profile.service";
import { isUUID } from "class-validator";

const profileService = new ProfileService();

export class ProfileController {
  static async getAll(req: Request, res: Response) {
    const profiles = await profileService.findAll();
    return res.json(profiles);
  }

  static async getById(req: Request, res: Response) {
    const { id } = req.params;

    if (!id || !isUUID(id)) {
      return res
        .status(400)
        .json({ message: "Id do perfil não informado ou formato inválido" });
    }

    const profile = await profileService.findById(id);

    if (!profile) {
      return res.status(404).json({ message: "Profile not found" });
    }

    return res.json(profile);
  }
}
