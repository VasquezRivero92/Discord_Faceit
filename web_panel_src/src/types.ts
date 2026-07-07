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
