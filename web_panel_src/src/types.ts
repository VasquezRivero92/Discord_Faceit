export interface DiscordUser {
  username: string;
  displayName: string;
  avatarURL: string;
}

export interface Player {
  discordId: string;
  faceit_nickname: string;
  faceit_level: number;
  faceit_elo: number;
  mixton_guild_id: string;
  mixton_tier_override?: string | null;
  discordUser?: DiscordUser | null;
}

export interface Team {
  id: string;
  name: string;
  captain: Player | null;
  players: Player[];
}

export interface LobbyState {
  teams: Team[];
  pickOrder: string[];
  currentPickIndex: number;
  draftStarted: boolean;
  draftFinished: boolean;
}

export interface CurrentUser {
  userId: string;
  username: string;
  avatar: string;
  isAdmin: boolean;
  role?: string;
  servidor?: string;
  hasSavedPhone?: boolean;
  balance?: number;
  faceit_nickname?: string | null;
  skillLevel?: number | null;
  elo?: number | null;
  tier?: string | null;
  phoneNumber?: string | null;
}

export interface Guild {
  id: string;
  name: string;
}

export interface LobbyApiResponse {
  state: LobbyState;
  availablePlayers: {
    S: Player[];
    A: Player[];
    B: Player[];
    C: Player[];
    [key: string]: Player[];
  };
  currentUser?: CurrentUser;
  commandEnabled?: boolean;
  guildId?: string;
  guildName?: string;
}

export interface ToastMessage {
  id: string;
  text: string;
  type: 'success' | 'error' | 'info';
}

export interface PlayerBetStatus {
  discordId: string;
  faceit_nickname: string;
  displayName: string;
  avatarURL?: string | null;
  hasSavedPhone?: boolean;
  team: 'A' | 'B';
  teamName: string;
  isCaptain: boolean;
  balance: number;
  hasEnough: boolean;
  deficit: number;
}

export interface BetStatusResponse {
  betAmount: number;
  totalPot: number;
  allReady: boolean;
  teamA: { id: string; name: string };
  teamB: { id: string; name: string };
  players: PlayerBetStatus[];
}

export interface MixtonQueue {
  id: string;
  queueId: string;
  name: string;
  hubId?: string;
  hubName?: string;
  status: 'free' | 'busy';
  activeMatch?: { id: string; teamA: string; teamB: string; startedAt: number } | null;
}

export interface StoreProduct {
  id: string;
  name: string;
  category: string;
  price: number;
  currency: string;
  badge?: string;
  description: string;
  features: string[];
  image: string;
}

export interface CartItem {
  product: StoreProduct;
  quantity: number;
}

export interface ClaimFormData {
  consumerName: string;
  consumerDocType: string;
  consumerDocNumber: string;
  consumerEmail: string;
  consumerPhone: string;
  consumerAddress: string;
  isMinor: boolean;
  parentName?: string;
  parentDocNumber?: string;
  contractedType: 'PRODUCTO' | 'SERVICIO';
  claimedAmount: string;
  goodsDescription: string;
  claimType: 'RECLAMO' | 'QUEJA';
  claimDetail: string;
  consumerRequest: string;
  acceptTerms: boolean;
}

export type ActiveView = 
  | 'inicio'
  | 'mixton'
  | 'arena'
  | 'tienda'
  | 'cuenta'
  | 'login'
  | 'terminos'
  | 'devoluciones'
  | 'libro-de-reclamaciones'
  | 'contacto';

