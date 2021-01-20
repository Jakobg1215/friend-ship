import fs from "fs";
import { argument, CommandContext, CommandDispatcher, literal, string } from "@jsprismarine/brigadier";
import type PluginApi from "@jsprismarine/prismarine/dist/src/plugin/api/versions/1.0/PluginApi";
//import PlayerSpawnEvent from "@jsprismarine/prismarine/dist/src/events/player/PlayerSpawnEvent";
//import PlayerDespawnEvent from "@jsprismarine/prismarine/dist/src/events/player/PlayerDespawnEvent";
import Player from "@jsprismarine/prismarine/dist/src/player/Player";
import Command from "@jsprismarine/prismarine/dist/src/command/Command";
import ChatEvent from "@jsprismarine/prismarine/dist/src/events/chat/ChatEvent";

export default class PluginBase {
    public api: PluginApi;

    public constructor(api: PluginApi) {
        this.api = api;
    }

    public async onEnable() {
        if (!fs.existsSync("./plugins/friend-ship/friends")) fs.mkdirSync("./plugins/friend-ship/friends");
        await this.registerCommands();
        await this.api.getEventManager().on("chat", async (event: ChatEvent) => {
            const message = event.getChat().getMessage()
            if (message.startsWith("§e") && message.endsWith("game")) {
                event.preventDefault();
                const player = event.getChat().getSender().getServer().getPlayerManager().getPlayerByExactName(message.split(" ", 1)[0].slice(2));
                const type = message.split(" ", 2)[1];

                let file: any[];
                try {
                    const path = `${__dirname}/friends/${player.getXUID()}.json`;
                    if (!fs.existsSync(path)) fs.writeFileSync(path, "[]");
                    file = JSON.parse(fs.readFileSync(path, "utf8"));
                } catch (error) {
                    return;
                }

                player.getServer().getPlayerManager().getOnlinePlayers().forEach(async Player => {
                    for (const user of file) {
                        if (type === "joined") {
                            if (Player.getXUID() === user["xuid"]) await Player.sendMessage(`§a${player.username.name} has joined the server!`);
                        } else if (Player.getXUID() === user["xuid"]) await Player.sendMessage(`§a${player.username.name} has left the server!`);
                    }
                })
            }
        });
    }

    public async onDisable() { }

    private async registerCommands() {
        await this.api.getServer().getCommandManager().registerClassCommand(new class FriendCommand extends Command {
            public constructor() {
                super({
                    id: "friends:friend",
                    description: "Add or remove a friend from your friend list.",
                    permission: "friends.command.friend",
                    aliases: ["f"]
                });
            }

            public async register(dispatcher: CommandDispatcher<any>) {
                dispatcher.register(
                    literal("friend").then(
                        argument("edit", string()).executes(async (context: CommandContext<any>) => {
                            const edit = context.getArgument("edit");
                            const sender = context.getSource() as Player;

                            if (edit === "add" || "remove") return await sender.sendMessage("§cNeed to specify a player!");

                            if (edit === "list") {

                                let file: any[];
                                try {
                                    const path = `${__dirname}/friends/${sender.getXUID()}.json`;
                                    if (!fs.existsSync(path)) fs.writeFileSync(path, "[]");
                                    file = JSON.parse(fs.readFileSync(path, "utf8"));
                                } catch (error) {
                                    return await sender.sendMessage("§cYou have no friends! :(");
                                }

                                let message = "";
                                let count = 0;
                                for (const user of file) {
                                    const target = sender.getServer().getPlayerManager().getOnlinePlayers().find(player => player.getXUID() === user["xuid"]);
                                    if (!target) {
                                        if (count < 8) {
                                            message = `${message} §c${user["name"]}§r`
                                            count++;
                                            break;
                                        }
                                        message = `${message} §c${user["name"]}§r\n`
                                        count = 0;
                                    } else {
                                        if (count < 8) {
                                            message = `${message} §a${user["name"]}§r`
                                            count++;
                                            break;
                                        }
                                        message = `${message} §a${user["name"]}§r\n`
                                        count = 0;
                                    }
                                }
                            }

                            return await sender.sendMessage(`§c'${edit}' is not a valid argument!`);
                        }).then(
                            argument("player", string()).executes(async (context: CommandContext<any>) => {
                                const edit = context.getArgument("edit");
                                const sender = context.getSource() as Player;
                                const player = context.getArgument("player");
                                let target: Player;
                                try {
                                    target = sender.getServer().getPlayerManager().getPlayerByName(player);
                                } catch (error) {
                                    return await sender.sendMessage(`§cCan't find the player '${player}'!`);
                                }

                                if (!sender.isPlayer()) return await sender.sendMessage("§cYou can't run this in the console");
                                //if (sender.getUsername() === target.getUsername()) return await sender.sendMessage("§cCan't add/remove your self as a friend!");

                                const path = `./plugins/friend-ship/friends/${sender.getXUID()}.json`;
                                if (!fs.existsSync(path)) fs.createWriteStream(path).write("[]");
                                const file: any[] = JSON.parse(fs.readFileSync(path, "utf8"));

                                if (edit === "add") {
                                    console.log(target.username.name);
                                    for (const user of file) {
                                        if (user["xuid"] === target.getXUID()) return await sender.sendMessage(`You already have '${target.username.name}' as a friend!`);
                                    }

                                    file.push({ "username": target.username.name, "xuid": target.getXUID() });
                                    fs.writeFileSync(path, JSON.stringify(file));
                                    await target.sendMessage(`'${sender.username.name}' has added you as a friend!`);

                                    return await sender.sendMessage(`§aAdded '${target.username.name}' as a friend!`);
                                }

                                if (edit === "remove") {
                                    let found = false;
                                    for (const user of file) {
                                        if (user["xuid"] === target.getXUID()) found = true;
                                    }
                                    if (!found) return await sender.sendMessage(`'${target.username.name}' is not on your friend list!`);

                                    const remove = file.map(function (item) { return item.xuid; }).indexOf(target.getXUID());
                                    file.splice(remove, 1);
                                    fs.writeFileSync(path, JSON.stringify(file));

                                    return await sender.sendMessage(`§aRemoved '${target.username.name}' from your friend's list!`);
                                }

                                return await sender.sendMessage(`§c'${edit}' is not a valid argument!`);
                            })
                        )
                    )
                );
            }
        }, this.api.getServer());
    }
}