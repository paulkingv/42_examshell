//# headers | Headers
//! Two headers: one for printing, one for memory and atoi.
//? Header for fprintf
#include <stdio.h>
//? Header for malloc, free and atoi
#include <stdlib.h>

//# print_solution | print_solution()
//! Print one finished board: the row of the queen in each column, separated by spaces.
//? Declare: the positions and how many there are
void	print_solution(int *pos, int n)
{
//? Start at the first column
	int	i = 0;

//? For every column
	while (i < n)
	{
//? Print the row of this column's queen
		fprintf(stdout, "%d", pos[i]);
//? Is this not the last column?
		if (i < n - 1)
//? Then print a space || No space after the last number.
			fprintf(stdout, " ");
//? Next column
		i++;
	}
//? End the line
	fprintf(stdout, "\n");
}

//# is_safe | is_safe()
//! Can a queen go on (col, row)? Compare with every queen already placed in the columns to the left.
//? Declare: the positions, and the column and row to test
int	is_safe(int *pos, int col, int row)
{
//? Start at the first placed queen
	int	i = 0;

//? For every column left of ours || Only those have queens so far.
	while (i < col)
	{
//? Is that queen on the same row?
		if (pos[i] == row)
//? Then the square is attacked
			return (0);
//? Is that queen on a diagonal? || On a diagonal, the row distance equals the column distance. Checked in both directions, up and down.
		if (pos[i] - row == col - i || row - pos[i] == col - i)
//? Then the square is attacked
			return (0);
//? Next placed queen
		i++;
	}
//? No queen attacks: the square is safe
	return (1);
}

//# solve | solve()
//! Place queens column by column. Try every row. When one is safe, put the queen there and go on to the next column.
//? Declare: the positions, the board size, and the column to fill
void	solve(int *pos, int n, int col)
{
//? Start trying at the first row
	int	row = 0;

//? Have all columns got a queen?
	if (col == n)
	{
//? Print this board
		print_solution(pos, n);
//? Go back and look for other boards
		return ;
	}
//? Try every row of this column
	while (row < n)
	{
//? Can a queen stand here?
		if (is_safe(pos, col, row))
		{
//? Put the queen on this row
			pos[col] = row;
//? Fill the next column || When that call returns, the loop simply tries the next row. Overwriting pos[col] is the undo.
			solve(pos, n, col + 1);
		}
//? Next row
		row++;
	}
}

//# main | main()
//! Read the board size, allocate one slot per column, start solving at column 0.
//? Start main with the argument count and values
int	main(int argc, char **argv)
{
//? Declare the board size
	int	n;
//? Declare the array: one row number per column
	int	*pos;

//? Not exactly one argument?
	if (argc != 2)
//? Exit with an error
		return (1);
//? Turn the argument into a number
	n = atoi(argv[1]);
//? Nothing to place?
	if (n <= 0)
//? Exit quietly
		return (0);
//? Allocate one int per column
	pos = malloc(sizeof(int) * n);
//? Did the allocation fail?
	if (!pos)
//? Exit with an error
		return (1);
//? Start placing from column 0
	solve(pos, n, 0);
//? Free the array
	free(pos);
//? Done: success
	return (0);
}
