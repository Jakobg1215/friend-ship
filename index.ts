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

                if (type !== "joined" && type !== "left") return;
                event.preventDefault();

                joiner.getServer().getPlayerManager().getOnlinePlayers().forEach(async Player => {
                    for (const user of this.api.getConfigBuilder("friends.json").get(joiner.getXUID(), [])) {
                        if (Player.getXUID() === user.xuid) {

                            if (type === "joined") {
                                await Player.sendMessage(`§a${joiner.getName()} has joined the server!`);
                            } else await Player.sendMessage(`§a${joiner.getName()} has left the server!`);
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
                            if (!sender.isPlayer()) return await sender.sendMessage("§cThis command can only be used by a player!");
                            const edit = context.getArgument("edit");

                            if (edit.toLowerCase() === "add" || edit.toLowerCase() === "remove") return await sender.sendMessage(`§c${edit} requires a player argument!`);

                            const friends = this.api.getConfigBuilder("friends.json");
                            const friendslist: any[] = friends.get(sender.getXUID(), []);
                            if (friendslist.length === 0) return await sender.sendMessage("§cYou have no friends! :(");
                            const line = "§9§l-----------------------------------------------------§r";
                            // TODO: Make this into a switch when adding more.
                            if (edit.toLowerCase() === "list") {
                                let players = "";
                                const page = 1;
                                for (const user of friendslist) { // TODO: Make the pages only show 8 players instead of all of them.
                                    const target = sender.getServer().getPlayerManager().getOnlinePlayers().find(player => player.getXUID() === user.xuid);
                                    target ? players = players + `§7${target.getName()}§a is currently online\n` : players = players + `§7${user.name}§c is currently online\n`;
                                }
                                const pageamount = Math.floor(friendslist.length / 9) + 1;
                                return await sender.sendMessage(`${line}\n                  §6Friends (Page ${page} of ${pageamount})§r\n${players}${line}`);
                            }

                            if (edit.toLowerCase() === "help") { // TODO: Add all the command arguments to help when they are added.
                                const addCommand = "§e/f add Player§7 - §bAdd a player as a friend§r";
                                const helpCommand = "§e/f help§7 - §bPrints all available friend commands."
                                const removeCommand = "§e/f add Player§7 - §bRemove a player from your friend§r";

                                return await sender.sendMessage(`${line}\n${addCommand}\n${helpCommand}\n${removeCommand}\n${line}`);
                            }

                            return await sender.sendMessage(`§c${edit} is not a valid argument!`);
                        }).then(
                            argument("player", string()).executes(async (context: CommandContext<any>) => {
                                const sender = context.getSource() as Player;
                                if (!sender.isPlayer()) return await sender.sendMessage("§cThis command can only be used by a player!");

                                const edit = context.getArgument("edit");
                                const player = context.getArgument("player");
                                let target: Player;
                                try {
                                    target = this.api.getServer().getPlayerManager().getPlayerByExactName(player);
                                } catch (error) {
                                    return await sender.sendMessage(`§c${player} is not online or doen't exist!`);
                                }

                                //if (sender.getName() === target.getName()) return await sender.sendMessage("§cYou can't add yourself as a friend!");
                                if (edit.toLowerCase() !== "add" && edit.toLowerCase() !== "remove") return await sender.sendMessage(`§c${edit} is not a valid argument!`);

                                const friends = this.api.getConfigBuilder("friends.json");
                                let friendslist: any[] = friends.get(sender.getXUID(), [{ name: target.getName(), xuid: target.getXUID() }]);

                                // TODO: Make this into a switch when adding more.
                                if (edit.toLowerCase() === "add") { // TODO: Make theses request to the target.
                                    if (friendslist.find(predicate => predicate.xuid === target.getXUID())) return await sender.sendMessage(`§c${target.getName()} is already on your friends list!`);
                                    friendslist.push({ name: target.getName(), xuid: target.getXUID() });
                                    friends.set(sender.getXUID(), friendslist);
                                    return await sender.sendMessage(`§aAdded ${target.getName()} to your friends list!`);
                                }
                                else {
                                    if (!friendslist.find(predicate => predicate.xuid === target.getXUID())) return await sender.sendMessage(`§c${target.getName()} is not on your friends list!`);
                                    friendslist = friendslist.filter(predicate => predicate.xuid !== target.getXUID());
                                    friends.set(sender.getXUID(), friendslist);
                                    return await sender.sendMessage(`§aRemoved ${target.getName()} from your friends list!`);
                                }
                            })
                        )
                    )
                );
            },
            execute: async (sender: Player, args: any[]) => { }
        })
    }
    public async onDisable() { }
}