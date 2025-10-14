import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  OneToMany,
  JoinColumn,
} from "typeorm";
import { Service } from "./Service";
import { Profile } from "./Profile";
import { Address } from "./Address";

@Entity("companies")
export class Company {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "varchar", length: 100 })
  companyName: string;

  @Column({ nullable: true, type: "varchar", length: 100 })
  specialty?: string;

  @Column({ nullable: true, type: "varchar", length: 100 })
  bio?: string;

  @OneToOne(() => Address)
  @JoinColumn()
  address: Address;

  @OneToMany(() => Service, (service) => service.company)
  services: Service[];

  @OneToOne(() => Profile, (profile) => profile.company)
  @JoinColumn()
  profile: Profile;
}
