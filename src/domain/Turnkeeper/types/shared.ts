import TurnkeeperClass from '@/domain/Turnkeeper/index.ts';
import { Link } from '@/domain/Turnkeeper/types/local/index.ts';

export type Turnkeeper = TurnkeeperClass;

export type Placement = Array<Link>;
