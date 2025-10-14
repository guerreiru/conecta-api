import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
} from "typeorm";
import { Profile } from "./Profile";
import { Service } from "./Service";
import { Address } from "./Address";

@Entity("providers")
export class Provider {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "varchar", length: 100, nullable: true })
  providerName?: string;

  @Column({ nullable: true, type: "varchar", length: 100 })
  specialty?: string;

  @Column({ nullable: true, type: "varchar", length: 100 })
  bio?: string;

  @OneToOne(() => Address)
  @JoinColumn()
  address: Address;

  @OneToOne(() => Profile, (profile) => profile.provider)
  @JoinColumn()
  profile: Profile;

  @OneToMany(() => Service, (service) => service.provider)
  services: Service[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
