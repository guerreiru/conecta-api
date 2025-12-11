import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { User } from "./User";
import { PlanType, SubscriptionStatus } from "../types/PlanType";

@Entity("subscriptions")
export class Subscription {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({
    type: "enum",
    enum: PlanType,
    default: PlanType.FREE,
  })
  plan: PlanType;

  @Column({
    type: "enum",
    enum: SubscriptionStatus,
    default: SubscriptionStatus.ACTIVE,
  })
  status: SubscriptionStatus;

  @Column({ type: "varchar", nullable: true })
  stripeCustomerId?: string;

  @Column({ type: "varchar", nullable: true })
  stripeSubscriptionId?: string;

  @Column({ type: "varchar", nullable: true })
  stripePriceId?: string;

  @Column({ type: "timestamp", nullable: true })
  currentPeriodStart?: Date;

  @Column({ type: "timestamp", nullable: true })
  currentPeriodEnd?: Date;

  @Column({ type: "timestamp", nullable: true })
  canceledAt?: Date;

  @OneToOne(() => User, (user) => user.subscription)
  @JoinColumn()
  user: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
