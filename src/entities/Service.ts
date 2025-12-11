import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  Index,
} from "typeorm";
import { Category } from "./Category";
import { User } from "./User";
import { Review } from "./Review";
import { HighlightLevel } from "../types/HighlightLevel";

@Entity("services")
export class Service {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Index()
  @Column({ type: "varchar", length: 100 })
  title: string;

  @Column({ nullable: true, type: "varchar", length: 100 })
  description?: string;

  @Column("decimal", { precision: 10, scale: 2 })
  price: number;

  @Column({ type: "boolean", default: true })
  isActive?: boolean;

  @Column({
    type: "varchar",
    length: 100,
    nullable: false,
  })
  typeOfChange: string;

  @Column({ type: "boolean", default: false })
  isHighlighted: boolean;

  @Column({
    type: "enum",
    enum: HighlightLevel,
    nullable: true,
  })
  highlightLevel?: HighlightLevel;

  @Column({
    type: "enum",
    enum: ["all", "in_person", "online"],
    default: "in_person",
  })
  serviceType: "all" | "in_person" | "online";

  @Column("decimal", { precision: 3, scale: 2, default: 0 })
  averageRating: number;

  @Column({ type: "int", default: 0 })
  reviewCount: number;

  @ManyToOne(() => Category, (category) => category.services)
  category: Category;

  @ManyToOne(() => User, (user) => user.services)
  user: User;

  @OneToMany(() => Review, (review) => review.service, { nullable: true })
  reviews?: Review[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
