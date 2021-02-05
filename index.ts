import { CommandContext, CommandDispatcher, argument, literal, string } from "@jsprismarine/brigadier";
import type ChatEvent from "@jsprismarine/prismarine/dist/src/events/chat/ChatEvent";
import type Player from "@jsprismarine/prismarine/dist/src/player/Player";
import type PluginApi from "@jsprismarine/prismarine/dist/src/plugin/api/versions/1.0/PluginApi";

export default class PluginBase {
    api: PluginApi;
    public constructor(api: PluginApi) { this.api = api; }

    public async onEnable() {
        await this.api.getEventManager().on("chat", async (event: ChatEvent) => {
            const message = event.getChat().getMessage()
            if (message.startsWith("§e") && message.endsWith("game")) {
                const joiner = event.getChat().getSender().getServer().getPlayerManager().getPlayerByExactName(message.split(" ", 1)[0].slice(2));
                const type = message.split(" ", 2)[1];
                if (type !== "joined" && type !== "left")
                    return;
                event.preventDefault();
                joiner.getServer().getPlayerManager().getOnlinePlayers().forEach(async Player => {
                    for (const user of this.api.getConfigBuilder("friends.json").get(joiner.getXUID(), [])) {
                        if (Player.getXUID() === user.xuid) {
                            if (type === "joined") {
                                await Player.sendMessage(`§aFriendship > ${joiner.getName()} has joined the server!`);
                            } else
                                await Player.sendMessage(`§aFriendship > ${joiner.getName()} has left the server!`);
                        }
                    }
                });
            }
        });
        await this.api.getServer().getCommandManager().registerClassCommand({
            id: "friends:friend",
            description: "Add or remove a friend from your friend list.",
            permission: "friends.command.friend",
            aliases: ["f"],
            register: async (dispatcher: CommandDispatcher<any>) => {
                dispatcher.register(
                    literal("friend").then(
                        argument("edit", string()).executes(async (context: CommandContext<any>) => {
                            const sender = context.getSource() as Player;
                            if (!sender.isPlayer())
                                return await sender.sendMessage("§cThis command can only be used by a player!");
                            const edit = context.getArgument("edit");
                            const line = "§9§l-----------------------------------------------------§r";
                            switch (edit.toLowerCase()) {
                                case "accept":
                                case "add":
                                case "deny":
                                case "remove":
                                    return await sender.sendMessage(`${line}\n§cInvalid usage! Valid usage: /friend ${edit} Player\n${line}`);
                                case "list":
                                    const friendslist: any[] = this.api.getConfigBuilder("friends.json").get(sender.getXUID(), []);
                                    if (friendslist.length === 0)
                                        return await sender.sendMessage(`${line}\n§eYou don't have any friends yet! Add some with /friend add Player\n${line}`);
                                    const players: string[] = [];
                                    const page = 1;
                                    for (const user of friendslist) { // TODO: Make the pages only show 8 players instead of all of them.
                                        const target = sender.getServer().getPlayerManager().getOnlinePlayers().find(player => player.getXUID() === user.xuid);
                                        target ? players.push(`§7${target.getName()}§a is currently online\n`) : players.push(`§7${user.name}§c is currently online\n`);
                                    }
                                    const pageamount = Math.floor(friendslist.length / 9) + 1;
                                    return await sender.sendMessage(`${line}\n                  §6Friends (Page ${page} of ${pageamount})§r\n${players.join("")}${line}`);
                                case "help":
                                    const commandlist: string[] = [];
                                    commandlist.push("§e/f accept Player§7 - §bAccept a friend request§r\n");
                                    commandlist.push("§e/f add Player§7 - §bAdd a player as a friend§r\n");
                                    commandlist.push("§e/f deny Player§7 - §bDecline a friend request§r\n");
                                    commandlist.push("§e/f help§7 - §bPrints all available friend commands.\n");
                                    commandlist.push("§e/f notifications§7 - §bToggle friend join/leave notifications\n");
                                    commandlist.push("§e/f remove Player§7 - §bRemove a player from your friends§r");
                                    return await sender.sendMessage(`${line}\n${commandlist.join("")}\n${line}`);
                                case "n":
                                case "notifications":
                                    const fsettings = this.api.getConfigBuilder("fsettings.json");
                                    const playersettings: any = fsettings.get(sender.getXUID(), { notifications: true });
                                    if (playersettings.notifications) {
                                        fsettings.set(sender.getXUID(), { notifications: false });
                                        return await sender.sendMessage(`${line}\n§eDisabled friend join/leave notifications!\n${line}`);
                                    } else {
                                        fsettings.set(sender.getXUID(), { notifications: true });
                                        return await sender.sendMessage(`${line}\n§eEnabled friend join/leave notifications!\n${line}`);
                                    }
                                default:
                                    let target: Player;
                                    try {
                                        target = this.api.getServer().getPlayerManager().getPlayerByExactName(edit);
                                    } catch (error) {
                                        return await sender.sendMessage(`§cNo player found with name ${edit}`);
                                    }
                                    const requests = this.api.getConfigBuilder("requests.json");
                                    const requestslist: any[] = requests.get("list", []);
                                    const friend = this.api.getConfigBuilder("friends.json");
                                    const friends: any[] = friend.get(sender.getXUID(), [{ name: target?.getName(), xuid: target?.getXUID() }]);
                                    if (!requestslist.find(predicate => predicate.to === target.getName()))
                                        return await sender.sendMessage(`${line}\n§cThat person hasn't invited you to be friends! Try§e /friend ${target.getName()}\n${line}`);
                                    friend.set(sender.getXUID(), friends.filter(predicate => predicate.name !== target.getName()));
                                    friends.push({ name: target.getName(), xuid: target.getXUID() });
                                    friend.set(sender.getXUID(), friends);
                                    return await sender.sendMessage(`${line}\n§aYou are now friends with§7 ${target.getName()}\n${line}`);
                            }
                        }).then(
                            argument("player", string()).executes(async (context: CommandContext<any>) => {
                                const sender = context.getSource() as Player;
                                if (!sender.isPlayer())
                                    return await sender.sendMessage("§cThis command can only be used by a player!");
                                const edit = context.getArgument("edit");
                                const player = context.getArgument("player");
                                let target: Player;
                                try {
                                    target = this.api.getServer().getPlayerManager().getPlayerByExactName(player);
                                } catch (error) {
                                    if (edit !== "remove")
                                        return await sender.sendMessage(`§cNo player found with name ${player}`);
                                }
                                const line = "§9§l-----------------------------------------------------§r";
                                if (sender.getName() === target!?.getName())
                                    return await sender.sendMessage(`${line}\n§cYou can't add yourself as a friend!\n${line}`);
                                const friends = this.api.getConfigBuilder("friends.json");
                                const friendslist: any[] = friends.get(sender.getXUID(), [{ name: target!?.getName(), xuid: target!?.getXUID() }]);
                                const requests = this.api.getConfigBuilder("requests.json");
                                const requestslist: any[] = requests.get("list", []);
                                switch (edit.toLowerCase()) {
                                    case "accept":
                                        if (!requestslist.find(predicate => predicate.to === target.getName()))
                                            return await sender.sendMessage(`${line}\n§cThat person hasn't invited you to be friends! Try§e /friend ${target!.getName()}\n${line}`);
                                        friends.set(sender.getXUID(), friendslist.filter(predicate => predicate.name !== target!.getName()));
                                        friendslist.push({ name: target!.getName(), xuid: target!.getXUID() });
                                        friends.set(sender.getXUID(), friendslist);
                                        return await sender.sendMessage(`${line}\n§aYou are now friends with§7 ${target!.getName()}\n${line}`);
                                    case "add":
                                        if (friendslist.find(predicate => predicate.xuid === target.getXUID()))
                                            return await sender.sendMessage(`§c${target!.getName()} is already on your friends list!`);
                                        if (requestslist.find(predicate => predicate.to === target.getName()))
                                            return await sender.sendMessage(`§c${target!.getName()} is already on your friends list!`);
                                        requestslist.push({
                                            to: target!.getName(),
                                            from: sender.getName(),
                                            time: Date.now()
                                        });
                                        requests.set("list", requestslist);
                                        await target!.sendMessage(`${line}\n§eFriend request from §7${target!.getName()}\n${line}`);
                                        return await sender.sendMessage(`${line}\n§eYou sent a friend request to ${target!.getName()}! They have 5 minutes to accept it!\n${line}`);
                                    case "deny":
                                        if (!requestslist.find(predicate => predicate.to === target.getName()))
                                            return await sender.sendMessage(`${line}\n§cThat person hasn't invited you to be friends! Try§e /friend ${target!.getName()}\n${line}`);
                                        requests.set("list", requestslist.filter(predicate => predicate.from !== target!.getName()));
                                        return await sender.sendMessage(`${line}\n§eDeclined ${target!.getName()}'s friend request!\n${line}`);
                                    case "remove":
                                        if (!friendslist.find(predicate => predicate.name === player))
                                            return await sender.sendMessage(`§c${player} is not on your friends list!`);
                                        friends.set(sender.getXUID(), friendslist.filter(predicate => predicate.name !== player));
                                        if (target!)
                                            await target.sendMessage(`${line}\n§7${sender.getName()}§e removed you from their friends list!\n${line}`);
                                        return await sender.sendMessage(`${line}\n§eYou removed§7 ${player}§e from your friends list!\n${line}`);
                                    default:
                                        return await sender.sendMessage(`§c${edit} is not a valid argument!`);
                                }
                            })
                        )
                    )
                );
            },
            execute: async (sender: Player, args: any[]) => { }
        });
        setInterval(() => {
            const requests = this.api.getConfigBuilder("requests.json");
            const requestslist: any[] = requests.get("list", []);
            requestslist.forEach(async (req) => {
                if ((Date.now() - req.time) >= 300000) {
                    await this.api.getServer().getPlayerManager().getPlayerByExactName(req.from)?.sendMessage(` `);
                    requests.set("list", requestslist.filter(predicate => predicate.name !== req.name));
                }
            });
        }, 50);
    }

    public async onDisable() {
        this.api.getConfigBuilder("requests.json").set("list", []);
    }
}
