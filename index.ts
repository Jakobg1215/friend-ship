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
                })
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
                            const friendslist: any[] = friends.get(sender.getXUID(), [])
                            if (friendslist.length === 0) return await sender.sendMessage("§cYou have no friends! :(");

                            if (edit.toLowerCase() === "list") {
                                let message = "";
                                let count = 0;
                                const bottombar = `§aYou have ${friendslist.length} in total!`;
                                for (const user of friendslist) {
                                    const target = sender.getServer().getPlayerManager().getOnlinePlayers().find(player => player.getXUID() === user.xuid);

                                    if (!target) {
                                        if (count < 8) {
                                            message = message + `§c${user.name}§r `;
                                            count++;
                                        } else {
                                            message = message + `§c${user.name}§r \n`;
                                            count = 0;
                                        }
                                    } else {
                                        if (count < 8) {
                                            message = message + `§a${user.name}§r `;
                                            count++;
                                        } else {
                                            message = message + `§a${user.name}§r \n`;
                                            count = 0;
                                        }
                                    }
                                }
                                return await sender.sendMessage(`${message}\n${bottombar}`);
                            } else return await sender.sendMessage(`§c${edit} is not a valid argument!`);
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

                                if (sender.getName() === target.getName()) return await sender.sendMessage("§cYou can't add yourself as a friend!");
                                if (edit.toLowerCase() !== "add" && edit.toLowerCase() !== "remove") return await sender.sendMessage(`§c${edit} is not a valid argument!`);

                                const friends = this.api.getConfigBuilder("friends.json");
                                let friendslist: any[] = friends.get(sender.getXUID(), [{ name: target.getName(), xuid: target.getXUID() }]);

                                if (edit.toLowerCase() === "add") {
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