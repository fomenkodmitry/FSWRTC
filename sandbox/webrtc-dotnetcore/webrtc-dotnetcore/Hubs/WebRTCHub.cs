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
                Clients.All.SendAsync("initReceive", Context.ConnectionId);
            }
            return base.OnConnectedAsync();
        }

        public override Task OnDisconnectedAsync(Exception exception)
        {
            _peers.Remove(Context.ConnectionId);
            Clients.All.SendAsync("removePeer", Context.ConnectionId);
            return base.OnDisconnectedAsync(exception);
        }

        public async Task Signal(Signal signal)
        {
            Console.WriteLine("sending signal from " + Context.ConnectionId +" to " + signal.signal.ToString() + " | " + signal.socket_id);
            await Clients.Client(signal.socket_id).SendAsync("signal", signal);

            // await Groups.AddToGroupAsync(Context.ConnectionId, roomId);
            // await Clients.Caller.SendAsync("joined", roomId);
            // await Clients.Group(roomId).SendAsync("ready");

        }

        public async Task InitSend(string socketId)
        {
            await Clients.Client(socketId).SendAsync("initSend", Context.ConnectionId);
        }
    }

    public class Signal
    {
        public string socket_id { get; set; }
        public object signal { get; set; }
    }
}
