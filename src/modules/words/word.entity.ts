import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'words' })
export class WordEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Index({ unique: true })
  @Column({ type: 'text' })
  word!: string; // full word

  @Index()
  @Column({ type: 'text', length: 1 })
  first!: string;

  @Index()
  @Column({ type: 'text', length: 1 })
  second!: string;

  @Index()
  @Column({ type: 'text', length: 1 })
  third!: string;

  @Index()
  @Column({ type: 'text', length: 1 })
  fourth!: string;

  @Index()
  @Column({ type: 'text', length: 1 })
  fifth!: string;
}
