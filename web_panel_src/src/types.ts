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
  phoneNumber?: string | null;
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
