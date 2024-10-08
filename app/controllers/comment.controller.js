import CommentModel from "../models/comment.model.js";
import ErrorHandler from "../utils/errorHandle.js";
import { catchAsync } from "../middlewares/catchAsyncError.js";
import ApartmentModel from "../models/apartment.model.js";
import mongoose from "mongoose";

export const createComment = catchAsync(async (req, res, next) => {
  const apartmentId = req.params.apartmentId;

  const foundApartment = await ApartmentModel.findById(apartmentId);

  if (!foundApartment) {
    return next(new ErrorHandler("Không tìm thấy căn hộ", 404));
  }

  foundApartment.rating.value += req.body.rating.value;
  foundApartment.rating.location += req.body.rating.location;
  foundApartment.rating.accuracy += req.body.rating.accuracy;
  foundApartment.rating.check_in += req.body.rating.check_in;
  foundApartment.rating.totalScope += req.body.rating.totalScope;
  foundApartment.rating.cleanliness += req.body.rating.cleanliness;
  foundApartment.rating.communication += req.body.rating.communication;

  foundApartment.totalComments += 1;

  const bodyCreate = {
    ...req.body,
    apartment: apartmentId,
    author: req.userId.id,
  };

  const newComment = new CommentModel(bodyCreate);
  await Promise.all([newComment.save(), foundApartment.save()]);

  return res.status(200).json({
    message: "Tạo bình luận thành công",
    data: newComment,
  });
});

export const getCommentByapartmentId = catchAsync(async (req, res, next) => {
  const apartmentId = new mongoose.Types.ObjectId(req.query.apartmentId);

  const rootComments = await CommentModel.aggregate([
    {
      $match: {
        apartment: apartmentId,
        $or: [
          { parentComment: { $eq: null } },
          { parentComment: { $exists: false } },
        ],
      },
    },
    {
      $lookup: {
        from: "comments",
        localField: "_id",
        foreignField: "parentComment",
        as: "children",
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "author",
        foreignField: "_id",
        as: "authorDetails",
      },
    },
    {
      $unwind: "$authorDetails",
    },
    {
      $lookup: {
        from: "users",
        let: { childrenAuthors: "$children.author" }, // Truyền danh sách author của các children
        pipeline: [
          {
            $match: {
              $expr: { $in: ["$_id", "$$childrenAuthors"] }, // So sánh _id với danh sách author
            },
          },
        ],
        as: "childrenAuthorDetails",
      },
    },
    {
      $addFields: {
        children: {
          $map: {
            input: "$children",
            as: "child",
            in: {
              $mergeObjects: [
                "$$child",
                {
                  authorDetails: {
                    $arrayElemAt: [
                      {
                        $filter: {
                          input: "$childrenAuthorDetails",
                          as: "author",
                          cond: { $eq: ["$$author._id", "$$child.author"] },
                        },
                      },
                      0,
                    ],
                  },
                },
              ],
            },
          },
        },
      },
    },
    {
      $sort: { created_at: -1 },
    },
  ]);

  res.status(200).json({
    message: "Lấy thông tin bình luận thành công",
    payload: rootComments,
  });
});
