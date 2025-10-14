import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";
import { Company } from "./Company";
import { Provider } from "./Provider";
import { Category } from "./Category";

@Entity("services")
export class Service {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "varchar", length: 100 })
  title: string;

  @Column({ nullable: true, type: "varchar", length: 100 })
  description: string;

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

  @ManyToOne(() => Company, (company) => company.services, { nullable: true })
  company?: Company;

  @ManyToOne(() => Provider, (provider) => provider.services, {
    nullable: true,
  })
  provider?: Provider;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
