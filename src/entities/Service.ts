import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  Index,
} from "typeorm";
import { Category } from "./Category";
import { User } from "./User";

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

  @Column({
    type: "varchar",
    length: 100,
    nullable: false,
  })
  typeOfChange: string;

  @ManyToOne(() => Category, (category) => category.services)
  category: Category;

  @ManyToOne(() => User, (user) => user.services)
  user: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
