import { describe, it, expect, beforeEach } from 'vitest';
import { useRoomStore } from './roomStore';

describe('roomStore', () => {
  beforeEach(() => {
    useRoomStore.getState().reset();
  });

  it('should initialize with default state', () => {
    const state = useRoomStore.getState();
    expect(state.connectionState).toBe('disconnected');
    expect(state.userId).toBeNull();
    expect(state.currentRoom).toBeNull();
    expect(state.participants).toEqual([]);
    expect(state.isMuted).toBe(true);
  });

  it('should set connection state', () => {
    useRoomStore.getState().setConnectionState('connected');
    expect(useRoomStore.getState().connectionState).toBe('connected');
  });

  it('should set user ID', () => {
    useRoomStore.getState().setUserId('user-123');
    expect(useRoomStore.getState().userId).toBe('user-123');
  });

  it('should join room', () => {
    useRoomStore.getState().joinRoom({
      roomId: 'room-1',
      roomName: 'Test Room',
      userId: 'user-1',
      userName: 'TestUser',
      livekitToken: 'token123',
      livekitUrl: 'ws://localhost:7880',
      participants: [
        { id: 'user-1', name: 'TestUser', isMuted: false, isAdmin: false },
      ],
      isNewRoom: true,
    });

    const state = useRoomStore.getState();
    expect(state.currentRoom?.id).toBe('room-1');
    expect(state.currentRoom?.name).toBe('Test Room');
    expect(state.participants.length).toBe(1);
  });

  it('should leave room', () => {
    useRoomStore.getState().joinRoom({
      roomId: 'room-1',
      roomName: 'Test Room',
      userId: 'user-1',
      userName: 'TestUser',
      livekitToken: 'token123',
      livekitUrl: 'ws://localhost:7880',
      participants: [],
      isNewRoom: true,
    });

    useRoomStore.getState().leaveRoom();

    const state = useRoomStore.getState();
    expect(state.currentRoom).toBeNull();
    expect(state.participants).toEqual([]);
  });

  it('should add participant', () => {
    useRoomStore.getState().addParticipant({
      id: 'user-2',
      name: 'User2',
      isMuted: false,
      isAdmin: false,
    });

    expect(useRoomStore.getState().participants.length).toBe(1);
    expect(useRoomStore.getState().participants[0].name).toBe('User2');
  });

  it('should remove participant', () => {
    useRoomStore.getState().addParticipant({
      id: 'user-2',
      name: 'User2',
      isMuted: false,
      isAdmin: false,
    });

    useRoomStore.getState().removeParticipant('user-2');

    expect(useRoomStore.getState().participants.length).toBe(0);
  });

  it('should update participant', () => {
    useRoomStore.getState().addParticipant({
      id: 'user-2',
      name: 'User2',
      isMuted: false,
      isAdmin: false,
    });

    useRoomStore.getState().updateParticipant('user-2', { isMuted: true });

    expect(useRoomStore.getState().participants[0].isMuted).toBe(true);
  });

  it('should track speaking participants', () => {
    useRoomStore.getState().setSpeaking('user-1', true);
    expect(useRoomStore.getState().speakingParticipants.has('user-1')).toBe(true);

    useRoomStore.getState().setSpeaking('user-1', false);
    expect(useRoomStore.getState().speakingParticipants.has('user-1')).toBe(false);
  });

  it('should track connection quality', () => {
    useRoomStore.getState().setConnectionQuality('user-1', 75);
    expect(useRoomStore.getState().connectionQualities.get('user-1')).toBe(75);
  });

  it('should toggle mute state', () => {
    expect(useRoomStore.getState().isMuted).toBe(true);

    useRoomStore.getState().setMuted(false);
    expect(useRoomStore.getState().isMuted).toBe(false);

    useRoomStore.getState().setMuted(true);
    expect(useRoomStore.getState().isMuted).toBe(true);
  });
});
