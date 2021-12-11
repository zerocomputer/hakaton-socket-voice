const {verifyToken} = require("./account");
const ApiError = require("../main/apiError");
const {Chat, ChatMember, AccountSession} = require("../main/database/models");

/**
 * Create chat
 * @param req
 * @return {Promise<void>}
 */
const create = async(req) => {
    const account = await verifyToken(req);

    const name = req.body.name;
    const membersList = req.body.membersList;

    if(typeof name === "undefined")
        throw new ApiError(400, "Name undefined");

    if(typeof membersList === "undefined")
        throw new ApiError(400, "Members list undefined");

    let membersIds;
    try{
        membersIds = JSON.parse(membersList);
    } catch (e) {
        throw new ApiError(400, "Members list is not JSON");
    }

    const chatCreating = await Chat.create(
        {
            name,
            admin_id: account.id
        }
    );

    if(!chatCreating)
        throw new ApiError(500, "Chat creating error");

    const chat_id = chatCreating.dataValues.id;
    const chat_members = [];

    ChatMember.create(
        {
            chat_id,
            account_id: account.id
        }
    );

    for(let account_id of membersIds) {
        chat_members.push(
            {
                account_id,
                chat_id
            }
        );
    }

    const membersCreating = await ChatMember.bulkCreate(chat_members);

    if(
        membersCreating ||
        chat_members === []
    )
        return {
            chat_id,
            name
        };

    throw new ApiError(500, "Error create chat members");
}

/**
 * Get all chats of my account
 * @param req
 * @return {Promise<void>}
 */
const getList = async(req) => {
    const account = await verifyToken(req);

    const listMyChats = await Chat.findAll(
        {
            include: {
                model: ChatMember,
                where: {
                    account_id: account.id
                }
            }
        }
    );

    if(!listMyChats)
        return {
            chats: []
        };

    return {
        chats: listMyChats
    };
}

module.exports = {
    create,
    getList
}