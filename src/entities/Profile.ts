import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";
import { User } from "./User";
import { Company } from "./Company";
import { Provider } from "./Provider";
import { UserRole } from "../types/UserRole";

@Entity("profiles")
export class Profile {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "enum", enum: ["client", "provider", "company", "seupai"] })
  type: UserRole;

  @ManyToOne(() => User, (user) => user.profiles)
  user: User;

  @OneToOne(() => Company, (company) => company.profile, { nullable: true })
  @JoinColumn()
  company?: Company;

  @OneToOne(() => Provider, (provider) => provider.profile, { nullable: true })
  @JoinColumn()
  provider?: Provider;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
