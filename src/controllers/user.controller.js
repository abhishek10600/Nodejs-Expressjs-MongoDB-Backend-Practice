const registerUser = (req, res) => {
  try {
    return res.status(201).json({
      success: true,
      message: "Ok",
    });
  } catch (error) {
    console.log("Error: ", error);
  }
};

export { registerUser };
