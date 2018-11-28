'use strict';

const BsseService = require('./base')
class OperatingGoodsService extends BsseService {
    // 收藏商品
    async collection(data) {
        const { ctx } = this
        const { _id } = ctx.session.userInfo
        let goods = await ctx.model.Goods.findOne({ id: data.id })
        let collection = new ctx.model.Collection({
            uid: _id,
            cid: goods.id,
            image_path: goods.image_path,
            name: goods.name,
            present_price: goods.present_price,
            add_time: +new Date()
        })
        await collection.save()
        this.success('收藏成功')
    }

    // 取消收藏
    async cancelCollection(id) {
        const { ctx } = this
        const { _id } = ctx.session.userInfo
        await ctx.model.Collection.deleteOne({ uid: _id, cid: id })
        this.success('取消收藏成功')
    }

    // 加入购物车
    async addShop(ids) {
        const { ctx } = this
        const { _id } = ctx.session.userInfo   // 用户id
        const goodsData = await ctx.model.ShopList.findOne({ cid: ids, uid: _id })

        // 购物车已经有了这条商品，商品默认+1
        if (goodsData) {
            await ctx.model.ShopList.findOneAndUpdate({ cid: ids, uid: _id }, {
                $set: {
                    count: goodsData.count += 1
                }
            })
        } else {  // 说明没有这条数据
            // 查到这条商品数据
            let goods = await ctx.model.Goods.findOne({ id: ids })
            let newGoods = new ctx.model.ShopList({
                uid: _id,
                present_price: goods.present_price,
                cid: goods.id,
                image_path: goods.image_path,
                name: goods.name,
                mallPrice: goods.present_price,
                check: false,
                count: 1,
                add_time: +new Date()
            })
            await newGoods.save()
        }
        this.success('加入购物车成功')
    }

    // 购物车增加减少
    async editCart(data) {
        const { ctx } = this
        await ctx.model.ShopList.findOneAndUpdate({ uid: ctx.session.userInfo._id, cid: data.id }, {
            $set: {
                'count': data.count,
                'mallPrice': data.mallPrice,
            }
        })
        this.success('修改成功')
    }

    // 购物车删除
    async deleteShop(data) {
        const { ctx } = this
        await ctx.model.ShopList.deleteMany({ uid: ctx.session.userInfo._id, cid: data })
        this.success('删除成功')
    }

    // 保存收货地址
    async address(data) {
        const { ctx } = this
        const { _id } = ctx.session.userInfo
        if (data.isDefault == true) {   // 设置默认地址
            await ctx.model.Address.updateMany({ uid: _id, isDefault: true }, {
                $set: {
                    'isDefault': false,
                }
            })
        }
        if (data.id) {    // 说明是更新地址
            await ctx.model.Address.updateOne({ _id: data.id, uid: _id }, data)
            this.success('修改成功')

        } else {  // 新增地址
            const datas = Object.assign(data, {
                uid: _id,
                add_time: +new Date()
            })

            const address = new ctx.model.Address(datas)
            await address.save()
            this.success('添加成功')
        }
    }

    // 删除单条收货地址
    async deleteAddress(id) {
        const { _id } = this.ctx.session.userInfo
        await this.ctx.model.Address.findOneAndDelete({ '_id': id, uid: _id })
        this.success('删除成功')
    }

    // 接受订单
    async order(data) {
        const { ctx } = this
        const uid = ctx.session.userInfo._id
        // 订单信息
        let platform = '622'           // 订单头
        let r1 = Math.floor(Math.random() * 10)
        let r2 = Math.floor(Math.random() * 10)
        // 'YYYY-MM-DD HH:mm:ss'
        let sysDate = ctx.helper.format(new Date(), 'YYYY-MM-DD HH:mm:ss')          // 系统时间
        let add_time = ctx.helper.format(new Date(), 'YYYY-MM-DD HH:mm:ss')   // 订单创建时间
        let order_id = platform + r1 + sysDate + r2;   // 订单id
        let shopList = []
        // 根据id查询出购物车订单
        for (let i = 0; i < data.orderId.length; i++) {
            if (data.idDirect) {    // 说明不是从购物车过来（直接购买）
                const res = await ctx.model.Goods.findOne({ id: data.orderId[0] })
                shopList[i] = {
                    count: data.count,
                    present_price: res.present_price,
                    cid: res.id,
                    image_path: res.image_path,
                    name: res.name,
                    mallPrice: data.count * res.present_price
                }
            } else {    // 购物车来的
                let item = await ctx.model.ShopList.find({ uid, cid: data.orderId[i] })
                shopList[i] = item[0]
            }
        }
        // 计算商品的总价（后端计算）
        const mallPrice = shopList.reduce((x, y) => {
            return x + y.present_price * y.count;
        }, 0)
        let orders = {
            uid,
            status: 0,
            order_id,
            tel: data.tel,
            address: data.address,
            add_time,
            mallPrice,
            order_list: shopList
        }
        // 存入数据库
        let orderList = new ctx.model.OrderList(orders)
        await orderList.save()
        this.success('提交成功')
    }

    // 接受订单
    async order1(data) {
        const { ctx } = this
        // 订单信息
        let platform = '622'           // 订单头
        let r1 = Math.floor(Math.random() * 10)
        let r2 = Math.floor(Math.random() * 10)
        // 'YYYY-MM-DD HH:mm:ss'
        let sysDate = ctx.helper.format(+new Date(), 'YYYYMMDDhhmmss')          // 系统时间
        let createDate = ctx.helper.format(+new Date(), 'YYYY-MM-DD hh:mm:ss')   // 订单创建时间
        let orderId = platform + r1 + sysDate + r2;   // 订单id
        const username = ctx.session.username
        let newData = []
        const order = await ctx.model.User.findOne({ username })
        if (!order.order) {
            order.order = {}
        }
        // 根据id查询出购物车订单
        for (let i = 0; i < data.orderId.length; i++) {
            if (data.idDirect) {
                const res = await ctx.model.Goods.findOne({ id: data.orderId[0] })
                newData[i] = {
                    order_id: orderId + i,
                    count: data.count,
                    present_price: res.present_price,
                    id: res.id,
                    image_path: res.image_path,
                    name: res.namem,
                    mallPrice: data.totalPrice,
                }
            } else {
                let item = await ctx.model.User.aggregate([
                    { "$unwind": "$shopList" },
                    { "$match": { "shopList.id": data.orderId[i], username } },
                    { "$project": { "shopList": 1 } }
                ])
                newData[i] = item[0].shopList
                newData[i].order_id = orderId + i
            }

        }
        if (!order.order[orderId]) {
            order.order[orderId] = {
                address: data.address,
                tel: data.tel,
                orderList: newData,
                totalPrice: data.totalPrice,
                createDate,
                orderId,
            }
        }
        await ctx.model.User.update({ username }, {
            $set: {
                'order': order.order,
            }
        })

        for (let i = 0; i < data.orderId.length; i++) {
            await ctx.model.User.findOneAndUpdate({ username, 'shopList.id': data.orderId[i] }, {
                $pull: {
                    'shopList': {
                        'id': data.orderId[i]
                    }
                }
            })
        }
        ctx.body = {
            code: 200,
            msg: '结算成功!'
        }
    }
}

module.exports = OperatingGoodsService;
