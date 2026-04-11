import type { WSSession, TickData } from '../types/api';

type TickListener = (data: TickData) => void;

class NorenWebSocket {
  private socket: WebSocket | null = null;
  private session: WSSession | null = null;
  private listeners: Map<string, Set<TickListener>> = new Map();
  private isConnected = false;
  private url = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/NorenWS`;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private heartbeatInterval: number | null = null;
  private pendingSubscriptions: string[] = [];

  public async connect(session: WSSession) {
    this.session = session;
    
    // Disconnect existing if any
    this.disconnect();

    return new Promise((resolve, reject) => {
      console.log('Connecting to NorenWS Proxy:', this.url);
      this.socket = new WebSocket(this.url);

      this.socket.onopen = () => {
        console.log('WebSocket Connection Opened. Authenticating...');
        this.reconnectAttempts = 0;
        this.sendHandshake();
      };

      this.socket.onmessage = (event) => {
        this.handleMessage(event, resolve);
      };

      this.socket.onerror = (error) => {
        console.error('WebSocket Transport Error:', error);
        this.isConnected = false;
        reject(error);
      };

      this.socket.onclose = (event) => {
        console.warn('WebSocket Connection Closed:', event.reason);
        this.isConnected = false;
        this.stopHeartbeat();
        this.attemptReconnect();
      };
    });
  }

  public disconnect() {
    this.stopHeartbeat();
    if (this.socket) {
      this.socket.onclose = null;
      this.socket.onmessage = null;
      this.socket.onerror = null;
      this.socket.onopen = null;
      this.socket.close();
      this.socket = null;
    }
    this.isConnected = false;
  }

  private sendHandshake() {
    if (!this.session || !this.socket) return;
    const authMessage = {
      susertoken: this.session.susertoken,
      t: 'c', 
      actid: this.session.actid,
      uid: this.session.uid,
      source: this.session.source,
    };
    console.log('→ WS Handshake Request:', authMessage);
    this.socket.send(JSON.stringify(authMessage));
  }

  private handleMessage(event: MessageEvent, resolve?: (v: any) => void) {
    try {
      const data = JSON.parse(event.data);
      
      // Handshake ACK
      if (data.t === 'ck') {
        if (data.s === 'OK') {
          console.log('✅ NorenWS Handshake Successful:', data);
          this.isConnected = true;
          this.startHeartbeat();
          this.subscribePending();
          if (resolve) resolve(true);
        } else {
          console.error('❌ NorenWS Handshake REJECTED:', data);
          this.isConnected = false;
          // We don't reject the promise here to allow handleMessage to continue, 
          // but the UI will see the state change.
        }
      }

      // Heartbeat ACK
      if (data.t === 'h') {
        // Heartbeat acknowledged by server
        return;
      }

      // Market Data Ticks
      if (data.t === 'tk' || data.t === 'tf') {
        this.emitTick(data);
      }
    } catch (err) {
      console.error('Failed to parse WS message:', err);
    }
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatInterval = window.setInterval(() => {
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        this.socket.send(JSON.stringify({ t: 'h' }));
      }
    }, 30000); // 30s heartbeat is safe for NorenWS
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private emitTick(data: TickData) {
    const token = data.tk;
    const set = this.listeners.get(token);
    if (set) {
      set.forEach(callback => callback(data));
    }
  }

  private subscribePending() {
    if (this.pendingSubscriptions.length > 0) {
      console.log('Resubscribing to pending tokens:', this.pendingSubscriptions);
      this.subscribe(this.pendingSubscriptions, () => {});
    }
  }

  private attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 10000);
      console.log(`Reconnecting in ${delay}ms (Attempt ${this.reconnectAttempts})...`);
      setTimeout(() => {
        if (this.session) this.connect(this.session);
      }, delay);
    }
  }

  public subscribe(tokens: string[], listener: TickListener) {
    const newTokens: string[] = [];
    tokens.forEach(token => {
      if (!this.listeners.has(token)) {
        this.listeners.set(token, new Set());
        newTokens.push(token);
      }
      if (!this.listeners.get(token)?.has(listener)) {
        this.listeners.get(token)?.add(listener);
      }
    });

    if (newTokens.length > 0) {
      // Add to pending for re-subs
      newTokens.forEach(t => {
        if (!this.pendingSubscriptions.includes(t)) {
          this.pendingSubscriptions.push(t);
        }
      });

      if (this.isConnected && this.socket) {
        const subMsg = {
          t: 't',
          k: newTokens.map(tk => `NFO|${tk}`).join('#'),
        };
        console.log('→ WS Subscribe:', subMsg);
        this.socket.send(JSON.stringify(subMsg));
      }
    }
  }

  public unsubscribe(tokens: string[], listener: TickListener) {
    tokens.forEach(token => {
      const set = this.listeners.get(token);
      if (set) {
        set.delete(listener);
        if (set.size === 0) {
          this.listeners.delete(token);
          this.pendingSubscriptions = this.pendingSubscriptions.filter(t => t !== token);
          
          if (this.isConnected && this.socket) {
             this.socket.send(JSON.stringify({
               t: 'u',
               k: `NFO|${token}`
             }));
          }
        }
      }
    });
  }
}

export const norenWS = new NorenWebSocket();
