import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from "typeorm";
import { City } from "./City";

@Entity("states")
export class State {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ unique: true, type: "varchar", length: 2 })
  acronym: string;

  @Index()
  @Column({ unique: true, type: "varchar", length: 100 })
  name: string;

  @OneToMany(() => City, (city) => city.state)
  cities: City[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
