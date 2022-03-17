using Microsoft.AspNetCore.SignalR;
using Newtonsoft.Json;
using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Threading.Tasks;

namespace webrtc_dotnetcore.Hubs
{
    public class WebRTCHub : Hub
    {
        private static Dictionary<string, string> _peers = new Dictionary<string, string>();

        public override Task OnConnectedAsync()
        {
            _peers.Add(Context.ConnectionId, Context.ConnectionId);
            foreach (var (id, _) in _peers) 
            {
                if (id == Context.ConnectionId)
                    continue;
                // peers[id].emit('initReceive', socket.id)
            }
            return base.OnConnectedAsync();
        }

        public override Task OnDisconnectedAsync(Exception exception)
        {
            _peers.Remove(Context.ConnectionId);
            return base.OnDisconnectedAsync(exception);
        }

        public async Task Signal()
        {
            // await Groups.AddToGroupAsync(Context.ConnectionId, roomId);
            // await Clients.Caller.SendAsync("joined", roomId);
            // await Clients.Group(roomId).SendAsync("ready");

        }

        public async Task initSend()
        {
            await Clients.All.SendAsync("initSend");
        }

    }

    /// <summary>
    /// Room management for WebRTCHub
    /// </summary>
    public class RoomManager
    {
        private int nextRoomId;
        /// <summary>
        /// Room List (key:RoomId)
        /// </summary>
        private ConcurrentDictionary<int, RoomInfo> rooms;

        public RoomManager()
        {
            nextRoomId = 1;
            rooms = new ConcurrentDictionary<int, RoomInfo>();
        }

        public RoomInfo CreateRoom(string connectionId, string name)
        {
            rooms.TryRemove(nextRoomId, out _);

            //create new room info
            var roomInfo = new RoomInfo
            {
                RoomId = nextRoomId.ToString(),
                Name = name,
                HostConnectionId = connectionId
            };
            bool result = rooms.TryAdd(nextRoomId, roomInfo);

            if (result)
            {
                nextRoomId++;
                return roomInfo;
            }
            else
            {
                return null;
            }
        }

        public void DeleteRoom(int roomId)
        {
            rooms.TryRemove(roomId, out _);
        }

        public void DeleteRoom(string connectionId)
        {
            int? correspondingRoomId = null;
            foreach (var pair in rooms)
            {
                if (pair.Value.HostConnectionId.Equals(connectionId))
                {
                    correspondingRoomId = pair.Key;
                }
            }

            if (correspondingRoomId.HasValue)
            {
                rooms.TryRemove(correspondingRoomId.Value, out _);
            }
        }

        public List<RoomInfo> GetAllRoomInfo()
        {
            return rooms.Values.ToList();
        }
    }

    public class RoomInfo
    {
        public string RoomId { get; set; }
        public string Name { get; set; }
        public string HostConnectionId { get; set; }
    }
}
