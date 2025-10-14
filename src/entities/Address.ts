import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity("addresses")
export class Address {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "varchar", length: 100 })
  zipCode: string;

  @Column({ type: "varchar", length: 100 })
  street: string;

  @Column({ type: "varchar", length: 100 })
  number: string;

  @Column({ type: "varchar", length: 100 })
  neighborhood: string;

  @Column({ type: "varchar", length: 100 })
  stateName: string;

  @Column({ type: "varchar", length: 100 })
  stateId: string;

  @Column({ type: "varchar", length: 100 })
  cityName: string;

  @Column({ type: "varchar", length: 100 })
  cityId: string;

  @Column({ type: "varchar", length: 100, nullable: true })
  website?: string;

  @Column({ type: "varchar", length: 20, nullable: true })
  phone?: string;
}
