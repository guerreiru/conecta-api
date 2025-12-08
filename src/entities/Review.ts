import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  Unique,
} from "typeorm";
import { Service } from "./Service";
import { User } from "./User";

@Entity("reviews")
@Unique("uk_review_service_user", ["service", "user"])
export class Review {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "int", nullable: false })
  rating: number;

  @Column({ type: "text", nullable: true })
  comment?: string;

  @Index()
  @ManyToOne(() => Service, (service) => service.reviews, {
    onDelete: "CASCADE",
  })
  service: Service;

  @Index()
  @ManyToOne(() => User, (user) => user.reviews, {
    onDelete: "CASCADE",
  })
  user: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
