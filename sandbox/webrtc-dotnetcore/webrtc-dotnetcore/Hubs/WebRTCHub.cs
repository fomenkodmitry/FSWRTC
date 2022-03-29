using Microsoft.AspNetCore.SignalR;
using Newtonsoft.Json;
using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Threading.Tasks;
using Newtonsoft.Json.Linq;

namespace webrtc_dotnetcore.Hubs
{
    public class WebRTCHub : Hub
    {
        private static IList<IDictionary<string, HubCallerContext>> _rooms =
            new List<IDictionary<string, HubCallerContext>>();
 
        private string Room = string.Join("-", new[] { "room" });
        private IDictionary<string, HubCallerContext> CurrentRoom = null;

        private IDictionary<string, HubCallerContext> GetCurrentRoom()
        {
            CurrentRoom = _rooms.LastOrDefault();
            if (CurrentRoom == null)
            {
                CurrentRoom = new Dictionary<string, HubCallerContext>();
                _rooms?.Add(CurrentRoom);
            }
            CurrentRoom.Add(Context.ConnectionId, Context);

            return CurrentRoom;
        }
        
        public override Task OnConnectedAsync()
        {
            Clients.Group(Room).SendAsync("newCaller", Context.ConnectionId);
            Groups.AddToGroupAsync(Context.ConnectionId, Room);
            return base.OnConnectedAsync();
        }

        public override Task OnDisconnectedAsync(Exception exception)
        {
            Clients.Group(Room).SendAsync("removePeer", Context.ConnectionId);
            GetCurrentRoom().Remove(Context.ConnectionId);
            Groups.RemoveFromGroupAsync(Context.ConnectionId, Room);
            return base.OnDisconnectedAsync(exception);
        }

        public async Task signal(Signal signal)
        {
            Console.WriteLine(signal.signal);
            await Clients.Client(signal.socketId).SendAsync("signal", new
            {
                socketId = Context.ConnectionId,
                signal = signal.signal
            });
        }

        public async Task sendMessage(string message)
        {
            await Clients.OthersInGroup(Room).SendAsync("receiveMessage", new {message, username = Context.GetHttpContext().Request.Query["username"]});
        }
        
        public async Task receivedCall(string receiverSocketId)
        {
            await Clients.Client(receiverSocketId).SendAsync("receivedCall", Context.ConnectionId);
        }
    }

    public class Signal
    {
        public string socketId { get; set; }
        public object signal { get; set; }
    }
}
