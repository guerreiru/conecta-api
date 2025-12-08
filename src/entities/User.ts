import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  OneToOne,
  JoinColumn,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { Address } from "./Address";
import { Service } from "./Service";
import { Review } from "./Review";

export type UserRole = "client" | "provider";

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

  @Column({ type: "varchar", length: 20, default: "client" })
  role: UserRole;

  @Column({ nullable: true, type: "varchar", length: 100 })
  specialty?: string;

  @Column({ nullable: true, type: "varchar", length: 255 })
  bio?: string;

  @Column({ type: "boolean", default: false })
  hasActivePlan: boolean;

  @OneToOne(() => Address, { nullable: true })
  @JoinColumn()
  address?: Address;

  @OneToMany(() => Service, (service) => service.user, { nullable: true })
  services?: Service[];

  @OneToMany(() => Review, (review) => review.user, { nullable: true })
  reviews?: Review[];

  @Column({ nullable: true, type: "varchar" })
  refreshToken?: string | null;

  @Column({ type: "timestamp with time zone", nullable: true })
  refreshTokenExpires?: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
