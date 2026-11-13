import styles from './TeamMemberCard.module.css';

interface TeamMemberCardProps {
  name: string;
  role: string;
  institution: string;
  bio?: string;
  photo?: string;
  links?: { type: string; url: string }[];
}

export function TeamMemberCard({ name, role, institution, bio, photo }: TeamMemberCardProps) {
  return (
    <div className={styles.card}>
      <div className={styles.avatar}>
        {photo ? <img src={photo} alt={name} className={styles.photo} /> : <div className={styles.placeholder} />}
      </div>
      <span className={styles.name}>{name}</span>
      <span className={styles.role}>{role}</span>
      <span className={styles.institution}>{institution}</span>
      {bio && <p className={styles.bio}>{bio}</p>}
    </div>
  );
}
