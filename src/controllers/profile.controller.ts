import { Request, Response } from "express";
import { ProfileService } from "../services/profile.service";

const profileService = new ProfileService();

export class ProfileController {
  static async getAll(req: Request, res: Response) {
    const profiles = await profileService.findAll();
    return res.json(profiles);
  }

  static async getById(req: Request, res: Response) {
    const { id } = req.params;
    const profile = await profileService.findById(id);

    if (!profile) {
      return res.status(404).json({ message: "Profile not found" });
    }

    return res.json(profile);
  }
}
