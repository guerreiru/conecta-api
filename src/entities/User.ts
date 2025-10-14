import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { Profile } from "./Profile";

@Entity("users")
export class User {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "varchar", length: 100 })
  name: string;

  @Column({ unique: true, type: "varchar", length: 100 })
  email: string;

  @Column({ type: "varchar", length: 100, select: false })
  password: string;

  @Column({ nullable: true, type: "varchar" })
  refreshToken?: string | null;

  @OneToMany(() => Profile, (profile) => profile.user, { cascade: true })
  profiles: Profile[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
