import { PrismaClient, type Chat, type Message, type User } from '@prisma/client';

const prisma = new PrismaClient();

export type MessageWithUser = Message & { user?: User };
export type ChatWithMessages = Chat & { messages: MessageWithUser[] };

export const dbService = {
  async createChat(userId: string, firstName: string, lastName: string) {
    try {
      console.log('💾 Creating chat for user ID:', userId);
      
      const user = await this.findUser('google', userId);

      if (!user) {
        throw new Error(`User not found for provider ID: ${userId}`);
      }

      const chat = await prisma.chat.create({
        data: { 
          firstName, 
          lastName,
          userId: user.id
        }
      });
      
      console.log('✅ Chat created with ID:', chat.id, 'for user ID:', userId);
      return chat;
    } catch (error) {
      console.error('❌ Database error creating chat:', error);
      throw error;
    }
  },

  async updateChat(userId: string, chatId: string, firstName: string, lastName: string) {
    console.log('✏️ Updating chat:', { userId, chatId, firstName, lastName });
    
    const user = await this.findUser('google', userId);

    if (!user) {
      console.log('❌ User not found for providerId:', userId);
      return false;
    }

    return await prisma.chat.update({
      where: { 
        id: chatId,
        userId: user.id // Проверяем принадлежность пользователю
      },
      data: { firstName, lastName }
    });
  },

  async deleteChat(userId: string, chatId: string) {
    console.log('🗑️ Deleting chat:', { userId, chatId });
    
    const user = await this.findUser('google', userId);

    if (!user) {
      console.log('❌ User not found for providerId:', userId);
      return false;
    }

    return await prisma.chat.delete({
      where: { 
        id: chatId,
        userId: user.id 
      }
    });
  },

  async getAllChats(userId: string, search?: string) {
    console.log('💾 DB: Getting chats for user ID:', userId);
    
    const user = await dbService.findUser('google', userId);
    

    try {
      const chats = await prisma.chat.findMany({
        where: {
          userId: user?.id,
          ...(search && {
            OR: [
              { firstName: { contains: search, mode: 'insensitive' } },
              { lastName: { contains: search, mode: 'insensitive' } }
            ]
          })
        },
        include: {
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            include: { user: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      console.log('💾 DB: Chats found:', chats.length);
      return chats;
    } catch (error) {
      console.error('💾 DB Error in getAllChats:', error);
      throw error;
    }
  },

  // Message operations
  async createMessage(text: string, chatId: string, userId?: string, type: string = 'user') {
    console.log('💬 Creating message:', { chatId, userId, type, textLength: text.length });
    
    return await prisma.message.create({
      data: {
        text,
        chatId,
        userId,
        type
      },
      include: { user: true }
    });
  },

  async getChatMessages(userId: string, chatId: string) {
    console.log('📥 Getting messages for chat:', { userId, chatId });
    
    const user = await prisma.user.findFirst({
      where: {
        providerId: userId
      }
    });

    console.log(`getChatMessages User: ${JSON.stringify(user)}`);

    try {
      // Сначала проверяем, что чат принадлежит пользователю
      const chat = await prisma.chat.findFirst({
        where: { 
          id: chatId, 
          userId: user?.id
        }
      });

      if (!chat) {
        throw new Error('Chat not found or access denied');
      }

      // Затем получаем сообщения
      const messages = await prisma.message.findMany({
        where: { chatId },
        include: { user: true },
        orderBy: { createdAt: 'asc' }
      });

      console.log('✅ Messages fetched:', messages.length);
      return messages;
    } catch (error) {
      console.error('❌ Error getting chat messages:', error);
      throw error;
    }
  },

  // User operations (for OAuth)
  async findUser(provider: string, providerId: string) {
    console.log('🔍 Finding user:', { provider, providerId });
    
    return await prisma.user.findFirst({
      where: { provider, providerId }
    });
  },
  
  async findOrCreateUser(provider: string, providerId: string, email: string, name?: string, avatar?: string) {
    console.log('🔍 Finding/creating user:', { provider, providerId, email });
    
    let user = await prisma.user.findFirst({
      where: { provider, providerId }
    });

    if (!user) {
      console.log('🆕 Creating NEW user:', email);
      user = await prisma.user.create({
        data: { provider, providerId, email, name, avatar }
      });

      const predefinedChats = [
        { firstName: 'John', lastName: 'Doe' },
        { firstName: 'Jane', lastName: 'Smith' },
        { firstName: 'Bob', lastName: 'Johnson' }
      ];
      
      console.log('📝 Creating predefined chats for new user');

      for (const chat of predefinedChats) {
        try {
          await this.createChat(providerId, chat.firstName, chat.lastName);
          console.log(`✅ Created chat: ${chat.firstName} ${chat.lastName}`);
        } catch (error) {
          console.error(`❌ Failed to create chat ${chat.firstName} ${chat.lastName}:`, error);
        }
      }
      console.log('🎉 New user setup completed');
    } else {
      console.log('👤 Existing user found:', user.email);
    }

    return user;
  },

  async validateChatOwnership(userId: string, chatId: string): Promise<boolean> {
    console.log('🔐 Validating chat ownership:', { userId, chatId });
    
    const chat = await prisma.chat.findFirst({
      where: { 
        id: chatId, 
        userId: userId 
      }
    });
    
    const isValid = !!chat;
    console.log('✅ Chat ownership valid:', isValid);
    return isValid;
  },

  async getUserById(userId: string) {
    console.log('👤 Getting user by ID:', userId);
    
    return await prisma.user.findUnique({
      where: { id: userId }
    });
  },

  async getUserByEmail(email: string) {
    console.log('👤 Getting user by email:', email);
    
    return await prisma.user.findUnique({
      where: { email }
    });
  }
};